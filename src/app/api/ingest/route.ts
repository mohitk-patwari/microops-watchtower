// src/app/api/ingest/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "../../../lib/mongo"; 
import { Redis } from "@upstash/redis";

/**
 * Notes:
 * - Redis is optional (works without Upstash).
 * - Uses updateOne + findOne fallback to guarantee a returned incidentDoc.
 * - Logs raw results to help debugging in dev.
 */


// Make Redis optional so the route works even when Upstash env vars aren't set.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const DEDUPE_TTL = parseInt(process.env.DEDUPE_TTL_SECONDS ?? "300", 10);

/**
 * Simple rule engine: array of { name, pattern, weight, tag }.
 * Extend or load from JSON in src/config/rules.json for production.
 */
const RULES: Array<{ name: string; pattern: RegExp; weight: number; tag: string }> = [
  { name: "oom", pattern: /outofmemory|oom/i, weight: 5, tag: "oom" },
  { name: "db", pattern: /mongo|mongodb|sql|deadlock/i, weight: 3, tag: "db" },
  { name: "auth", pattern: /unauthorized|jwt|auth/i, weight: 2, tag: "auth" },
  { name: "payment", pattern: /payment|charge|card/i, weight: 3, tag: "payment" },
];

/** Compute priority score from message/stack using simple regex rules */
function computePriority(message = "", stack = ""): { priority: number; tags: string[] } {
  let score = 0;
  const tags = new Set<string>();
  for (const r of RULES) {
    if (r.pattern.test(message) || r.pattern.test(stack)) {
      score += r.weight;
      tags.add(r.tag);
    }
  }
  // base priority at least 1
  score = Math.max(1, score);
  return { priority: score, tags: Array.from(tags) };
}

/** Deterministic fingerprint for grouping */
function computeFingerprint({
  service,
  errorType,
  message,
  stack,
}: {
  service?: string;
  errorType?: string;
  message?: string;
  stack?: string;
}) {
  // Use service + errorType or message + first stack line as grouping signal
  const firstStackLine =
    (stack ?? "").split("\n").map((s) => s.trim()).find(Boolean) ?? "";
  const base = `${service ?? "unknown"}|${errorType ?? ""}|${
    firstStackLine || (message?.slice(0, 256) ?? "")
  }`;
  return crypto.createHash("sha256").update(base).digest("hex");
}

export async function POST(request: Request) {
    try{
        const body = await request.json().catch(() => null);
        if (!body){
            return NextResponse.json({ok: false, error:"invalid JSON body"},{status:400});
        }

        // minimal required fields 
        const service: string = body.service ?? body.app ?? "unknown";
        const message: string = body.message ?? body.msg ?? "";
        const stack: string = body.stack ?? "";
        const errorType: string = body.errorType ?? body.type ?? "";
        
        const fingerprint = computeFingerprint({ service, errorType, message, stack });
        const receivedAt = new Date();
        const { priority: computedPriority, tags } = computePriority(message, stack);

        // connect to MongoDB
        const db = await connectToDatabase();
        const eventsCol = db.collection("events");
        const incidentsCol = db.collection("incidents");

        // 1) Store raw event (durable)
        const eventDoc = {
            service,
            message,
            stack,
            errorType,
            fingerprint,
            receivedAt,
            raw: body,
        };
        const eventInsert = await eventsCol.insertOne(eventDoc);
        const eventId = eventInsert.insertedId;

        // 3) Try to read from Redis cache first 
        const dedupeKey = `dedupe:${fingerprint}`;
        let cachedIncidentId: string | null = null;
        if (redis) {
            try {
                const v = await redis.get(dedupeKey);
                if (v) cachedIncidentId = String(v);
            } catch (err) {
                // Redis might be down - fallback to Mongo upsert below
                console.warn("Redis GET error (continuing):", err);
            }
        }

        // Mongo upsert: atomic create-or-update by fingerprint
        // $setOnInsert populates fields only when inserting 
        const now = new Date();
        const updateDoc = {
            $setOnInsert: {
                fingerprint,
                service,
                priority: computedPriority,
                firstSeen: now,
                sampleEventId :eventId,
                top_tags: tags,
            },
            $inc: { count: 1},
            $set: { lastSeen: now },
        };

        // If we have cachedIncidentId, prefer to update by _id for slightly faster path
    let incidentDoc: any = null;
          if (cachedIncidentId) {
      // cached id path (preferred): try update by _id, then read back
      try {
        const { ObjectId } = await import("mongodb");
        const oid = new ObjectId(cachedIncidentId);
        const updRes = await incidentsCol.updateOne({ _id: oid }, updateDoc);
        incidentDoc = await incidentsCol.findOne({ _id: oid });
      } catch (err) {
        const up = await incidentsCol.updateOne({ fingerprint }, updateDoc, { upsert: true });
        incidentDoc = await incidentsCol.findOne({ fingerprint });
      }
    } else {
      // no cache: upsert by fingerprint then read the document explicitly
      const up = await incidentsCol.updateOne({ fingerprint }, updateDoc, { upsert: true });
      incidentDoc = await incidentsCol.findOne({ fingerprint });
    }

        if (!incidentDoc) {
            throw new Error("Failed to upsert or retrieve incident document");
        }

        // 4) Try to set Redis cache to speed up future dedupe checks
    // cache id in Redis (best-effort)
    if (redis) {
      try {
        await redis.set(dedupeKey, String(incidentDoc._id), { nx: true, ex: DEDUPE_TTL });
      } catch (err) {
        // silently ignore Redis errors - upsert succeeded
      }
    }
        // 5) Return incident + event summary
        return NextResponse.json({
            ok: true,
            incident: {
                _id: String(incidentDoc._id),
                fingerprint: incidentDoc.fingerprint,
                service: incidentDoc.service,
                count: incidentDoc.count,
                priority: incidentDoc.priority,
                lastSeen: incidentDoc.lastSeen,
            },
            eventId: String(eventId),
        });
    } catch (err: any) {
        return NextResponse.json({ok:false, error: err?.message ?? String(err) },{status: 500 });
    }
}

// src/app/api/ingest/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { Redis } from "@upstash/redis";
import { MongoServerError } from "mongodb";
import type { Document } from "mongodb";

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

/** Compute priority score from message/stack using simple regex rules. Clamped to
 * [1, 10] so ingest-computed priority can never exceed the range enforced
 * elsewhere (validatePriorityNumber on manual create, the PATCH route's 1-10
 * check) — unclamped, stacking rule weights (e.g. oom+db+auth+payment = 13)
 * could violate that range. */
function computePriority(message = "", stack = ""): { priority: number; tags: string[] } {
  let score = 0;
  const tags = new Set<string>();
  for (const r of RULES) {
    if (r.pattern.test(message) || r.pattern.test(stack)) {
      score += r.weight;
      tags.add(r.tag);
    }
  }
  // base priority at least 1, capped at 10 to match the schema's range
  score = Math.max(1, Math.min(10, score));
  return { priority: score, tags: Array.from(tags) };
}

/**
 * Strip volatile, run-specific data out of an error string so that two
 * occurrences of the SAME underlying bug produce the SAME normalized text,
 * even though the raw text differs (different user id, different line
 * number after a deploy, different timestamp, etc).
 *
 * This is intentionally simple regex-based normalization — real systems
 * (Sentry) do AST-aware stack parsing, but this covers the common cases
 * you'll actually hit in a demo: object ids, uuids, hex addresses,
 * file:line:col positions, and embedded numbers of any length (short ids
 * like "bad-token-3" are just as dynamic as long ones — a magnitude
 * threshold has no basis here).
 */
function normalizeText(text = ""): string {
  return text
    // hex memory addresses: 0x7ffee3a1c
    .replace(/0x[0-9a-fA-F]+/g, "<hex>")
    // Mongo ObjectId-looking 24-char hex strings
    .replace(/\b[0-9a-fA-F]{24}\b/g, "<objectid>")
    // UUIDs
    .replace(
      /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
      "<uuid>"
    )
    // stack trace file positions: "file.js:45:12)"
    .replace(/:\d+:\d+\)?/g, ":<line>:<col>)")
    // any remaining run of digits: timestamps, order ids, user ids, ports,
    // short suffix ids like "bad-token-3" — no magnitude threshold, any
    // digit run is dynamic data, not a distinguishing feature of the bug
    .replace(/\b\d+\b/g, "<num>")
    // quoted literal values that tend to be dynamic (usernames, ids in messages)
    .replace(/'[^']*'|"[^"]*"/g, "<str>")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deterministic fingerprint for grouping, computed from a NORMALIZED signal
 * (see normalizeText) so the same underlying bug collapses to one fingerprint
 * regardless of the dynamic data (ids, timestamps) embedded in each occurrence. */
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
  const rawSignal = firstStackLine || (message?.slice(0, 256) ?? "");
  const normalizedSignal = normalizeText(rawSignal);
  const base = `${service ?? "unknown"}|${errorType ?? ""}|${normalizedSignal}`;
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
            } catch {
                // Redis might be down - fallback to Mongo upsert below
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
    let incidentDoc: Document | null = null;
          if (cachedIncidentId) {
      // cached id path (preferred): try update by _id, then read back
      try {
        const { ObjectId } = await import("mongodb");
        const oid = new ObjectId(cachedIncidentId);
        await incidentsCol.updateOne({ _id: oid }, updateDoc);
        incidentDoc = await incidentsCol.findOne({ _id: oid });
      } catch {
        await incidentsCol.updateOne({ fingerprint }, updateDoc, { upsert: true });
        incidentDoc = await incidentsCol.findOne({ fingerprint });
      }
    } else {
      // With the unique index from create-indexes.js in place, two concurrent
      // first-events for the same new fingerprint can both attempt this
      // upsert with no existing document to match. Mongo lets one insert
      // win and rejects the loser with a duplicate-key error (E11000)
      // instead of creating two incidents for one bug — but without a
      // retry, the loser's own count increment would be silently lost even
      // though its raw event was already stored above. On E11000 the
      // winning insert has already created the document, so retry as a
      // plain (non-upsert) update matched on fingerprint to land this
      // occurrence's count/lastSeen.
      try {
        await incidentsCol.updateOne({ fingerprint }, updateDoc, { upsert: true });
      } catch (err) {
        if (err instanceof MongoServerError && err.code === 11000) {
          await incidentsCol.updateOne({ fingerprint }, updateDoc);
        } else {
          throw err;
        }
      }
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
      } catch {
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
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ok:false, error: message },{status: 500 });
    }
}

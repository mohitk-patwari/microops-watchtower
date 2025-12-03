// src/app/api/incidents/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongo";

type PriorityFilter = "all" | "high" | "medium" | "low";

// Helper function to build priority query
function buildPriorityQuery(priority: PriorityFilter) {
  const ranges = {
    high: { $gte: 7 },
    medium: { $gte: 4, $lte: 6 },
    low: { $lte: 3 },
  } as const;

  if (priority === "all") {
    return undefined;
  }
  return ranges[priority];
}

// =============================
//        GET Handler
// =============================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "all";
    const priority = (searchParams.get("priority") as PriorityFilter) ?? "all";

    const page = Number(searchParams.get("page") || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    //Database Connection
    const db = await connectToDatabase();
    const col = db.collection("incidents");

    // ========== Build Query ==========
    // Build Mongo query dynamically
    const q: any = {};

    // Status filter
    if (status !== "all") q.status = status;

    // Priority filter
    const pQuery = buildPriorityQuery(priority);
    if (pQuery) q.priority = pQuery;

    // Text search or regex fallback
    
    if (search) {
    // Use text index if available
      q.$or = [
        { service: { $regex: search, $options: "i" } },
        { fingerprint: { $regex: search, $options: "i" } },
      ];
    }


    // Projection and sort
    const projection = {
      service: 1,
      fingerprint: 1,
      count: 1,
      priority: 1,
      status: 1,
      lastSeen: 1,
    };

    // ===== Query the DB =====


    const results = await col
          .find(q, { projection })
          .sort({ priority: -1, lastSeen: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        return NextResponse.json(results);
      } catch (err: any) {
        console.error("GET /api/incidents error:", err);
        return NextResponse.json(
          { error: err?.message ?? "Internal Server Error" },
          { status: 500 }
        );
      }
    }
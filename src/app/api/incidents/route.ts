/**
 * GET /api/incidents - List incidents with filtering
 * POST /api/incidents - Create a new incident
 */

import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { connectToDatabase } from "@/lib/db";
import {
  buildPriorityQuery,
  getPagination,
  normalizeIncident,
} from "@/lib/utils";
import {
  errorResponse,
  successResponse,
  validateStatusFilter,
  validatePriorityFilter,
  validateSearchQuery,
  validateServiceName,
  validatePriorityNumber,
  safeJsonParse,
} from "@/lib/api-helpers";
import { IncidentQueryFilter, IncidentCreateRequest } from "@/types/incidents";

/**
 * GET /api/incidents
 * Query params:
 * - status: "all" | "open" | "resolved"
 * - priority: "all" | "high" | "medium" | "low"
 * - service: string (exact match)
 * - search: string (search in service/fingerprint)
 * - page: number (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const statusValidation = validateStatusFilter(searchParams.get("status"));
    if (!statusValidation.valid) {
      return errorResponse(statusValidation.error!, 400, "INVALID_STATUS");
    }
    const status = statusValidation.value!;

    const priorityValidation = validatePriorityFilter(
      searchParams.get("priority")
    );
    if (!priorityValidation.valid) {
      return errorResponse(priorityValidation.error!, 400, "INVALID_PRIORITY");
    }
    const priority = priorityValidation.value!;

    const searchValidation = validateSearchQuery(searchParams.get("search"));
    if (!searchValidation.valid) {
      return errorResponse(searchValidation.error!, 400, "INVALID_SEARCH");
    }
    const search = searchValidation.value!;

    const service = searchParams.get("service")?.trim() || null;

    const { page, limit, skip } = getPagination(searchParams, 10);

    // Build MongoDB query
    const db = await connectToDatabase();
    const col = db.collection("incidents");

    const query: IncidentQueryFilter = {};

    // Status filter
    if (status !== "all") {
      query.status = status;
    }

    // Priority filter
    const priorityQuery = buildPriorityQuery(priority);
    if (priorityQuery) {
      query.priority = priorityQuery;
    }

    // Service filter (exact match)
    if (service) {
      query.service = service;
    }

    // Text search (service or fingerprint)
    if (search) {
      query.$or = [
        { service: { $regex: search, $options: "i" } },
        { fingerprint: { $regex: search, $options: "i" } },
      ];
    }

    // Projection
    const projection = {
      service: 1,
      fingerprint: 1,
      count: 1,
      priority: 1,
      status: 1,
      lastSeen: 1,
      firstSeen: 1,
      sampleEventId: 1,
      top_tags: 1,
    };

    // Query with sorting by timestamp desc (lastSeen)
    // Run the query with a maxTimeMS so slow queries fail fast instead of blocking the renderer
    const cursor = col
      .find(query, { projection })
      .sort({ lastSeen: -1, priority: -1 })
      .skip(skip)
      .limit(limit)
      .maxTimeMS(5000);

    let results;
    try {
      results = await cursor.toArray();
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      // Return a 503 indicating the database timed out or is unavailable
      return errorResponse(`Database query failed: ${msg}`, 503, "DB_QUERY_FAILED");
    }

    const normalizedResults = results.map(normalizeIncident);

    return successResponse({
      incidents: normalizedResults,
      pagination: {
        page,
        limit,
        total: normalizedResults.length,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";

    // If DB is unavailable, return a bundled fallback dataset so the UI stays usable.
    if (typeof errorMessage === "string" && errorMessage.includes("MONGODB_CONNECT_ERROR")) {
      try {
        const fallbackPath = join(process.cwd(), "src", "lib", "sample-data", "incidents-fallback.json");
        const raw = await readFile(fallbackPath, "utf8");
        const parsed = JSON.parse(raw);
        // Return fallback data with 200 so UI can render; include a flag so frontend can surface a notice
        return successResponse(parsed, 200);
      } catch (readErr) {
        const msg = readErr instanceof Error ? readErr.message : String(readErr);
        return errorResponse(`Database unavailable and fallback failed: ${msg}`, 503, "DB_UNAVAILABLE");
      }
    }

    return errorResponse(errorMessage, 500, "INTERNAL_ERROR");
  }
}

/**
 * POST /api/incidents
 * Body: { service: string, priority?: number, fingerprint?: string, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const parseResult = await safeJsonParse<IncidentCreateRequest>(request);
    if (!parseResult.success) {
      return errorResponse(parseResult.error!, 400, "INVALID_JSON");
    }

    const body = parseResult.data!;

    // Validate required fields
    const serviceValidation = validateServiceName(body.service as string);
    if (!serviceValidation.valid) {
      return errorResponse(serviceValidation.error!, 400, "INVALID_SERVICE");
    }
    const service = serviceValidation.value!;

    // Validate optional priority
    let priority = 1;
    if (body.priority !== undefined && body.priority !== null) {
      const priorityValue = body.priority as string | number;
      const priorityValidation = validatePriorityNumber(priorityValue);
      if (!priorityValidation.valid) {
        return errorResponse(priorityValidation.error!, 400, "INVALID_PRIORITY");
      }
      priority = priorityValidation.value!;
    }

    // Generate fingerprint if not provided
    const fingerprint =
      (body.fingerprint as string) ||
      `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const now = new Date();

    // Create incident document
    const incidentDoc: Record<string, unknown> = {
      service,
      fingerprint,
      count: 1,
      priority,
      status: (body.status as string) || "open",
      firstSeen: now,
      lastSeen: now,
      top_tags: Array.isArray(body.top_tags) ? body.top_tags : [],
    };

    // Add sampleEventId if provided
    if (body.sampleEventId) {
      incidentDoc.sampleEventId = body.sampleEventId;
    }

    const db = await connectToDatabase();
    const col = db.collection("incidents");

    // Insert incident
    const result = await col.insertOne(incidentDoc);

    // Fetch the created incident
    const created = await col.findOne({ _id: result.insertedId });
    if (!created) {
      return errorResponse("Failed to create incident", 500, "CREATE_FAILED");
    }

    return successResponse(
      {
        incident: normalizeIncident(created),
      },
      201
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return errorResponse(errorMessage, 500, "INTERNAL_ERROR");
  }
}

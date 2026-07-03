/**
 * GET /api/incidents/[id] - Get a single incident by ID
 * PATCH /api/incidents/[id] - Update an incident (mark resolved, etc.)
 */

import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";
import {
  errorResponse,
  successResponse,
  validateObjectId,
  safeJsonParse,
} from "@/lib/api-helpers";
import { normalizeIncident } from "@/lib/utils";
import { IncidentUpdateDocument, IncidentUpdateRequest } from "@/types/incidents";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/incidents/[id]
 * Returns a single incident or 404
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate ObjectID
    const idValidation = validateObjectId(id);
    if (!idValidation.valid) {
      return errorResponse(idValidation.error!, 400, "INVALID_ID");
    }

    const db = await connectToDatabase();
    const col = db.collection("incidents");

    const oid = new ObjectId(id);
    const incidentDoc = await col.findOne({ _id: oid });

    if (!incidentDoc) {
      return errorResponse("Incident not found", 404, "NOT_FOUND");
    }

    return successResponse({
      incident: normalizeIncident(incidentDoc),
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return errorResponse(errorMessage, 500, "INTERNAL_ERROR");
  }
}

/**
 * PATCH /api/incidents/[id]
 * Body: { status?: string, priority?: number, ... }
 * Updates incident and returns the updated document
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate ObjectID
    const idValidation = validateObjectId(id);
    if (!idValidation.valid) {
      return errorResponse(idValidation.error!, 400, "INVALID_ID");
    }

    // Parse request body
    const parseResult = await safeJsonParse<IncidentUpdateRequest>(request);
    if (!parseResult.success) {
      return errorResponse(parseResult.error!, 400, "INVALID_JSON");
    }

    const body = parseResult.data!;

    const db = await connectToDatabase();
    const col = db.collection("incidents");

    const oid = new ObjectId(id);

    // Build update document
    const updateDoc: IncidentUpdateDocument = {
      $set: {
        lastSeen: new Date(), // Always update timestamp
      },
    };

    // Update status if provided
    if (body.status !== undefined) {
      const status = String(body.status).toLowerCase();
      if (status === "open" || status === "resolved") {
        updateDoc.$set.status = status as "open" | "resolved";
      } else {
        return errorResponse(
          'Status must be "open" or "resolved"',
          400,
          "INVALID_STATUS"
        );
      }
    }

    // Update priority if provided
    if (body.priority !== undefined) {
      const priority = Number(body.priority);
      if (Number.isFinite(priority) && priority >= 1 && priority <= 10) {
        updateDoc.$set.priority = Math.round(priority);
      } else {
        return errorResponse(
          "Priority must be a number between 1 and 10",
          400,
          "INVALID_PRIORITY"
        );
      }
    }

    // Perform update
    const updateResult = await col.updateOne({ _id: oid }, updateDoc);

    // Check if document was found
    if (updateResult.matchedCount === 0) {
      return errorResponse("Incident not found", 404, "NOT_FOUND");
    }

    // Fetch updated document
    const updatedDoc = await col.findOne({ _id: oid });
    if (!updatedDoc) {
      return errorResponse(
        "Failed to retrieve updated incident",
        500,
        "RETRIEVE_FAILED"
      );
    }

    return successResponse({
      incident: normalizeIncident(updatedDoc),
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return errorResponse(errorMessage, 500, "INTERNAL_ERROR");
  }
}

import { PriorityFilter, IncidentDocument, Incident } from "@/types/incidents";
import { WithId, Document } from "mongodb";

export function buildPriorityQuery(priority: PriorityFilter) {
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

export function getPagination(searchParams: URLSearchParams, limit = 10) {
  const page = Number(searchParams.get("page") || 1);
  const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const skip = (normalizedPage - 1) * limit;

  return { page: normalizedPage, limit, skip };
}

/**
 * Normalize incident document from MongoDB to API response format
 * Accepts MongoDB's WithId<Document> type and safely converts to Incident
 */
export function normalizeIncident(
  doc: WithId<Document> | IncidentDocument | null | undefined
): Incident {
  if (!doc) {
    throw new Error("Cannot normalize null or undefined document");
  }

  // Type assertion for MongoDB document structure
  const incidentDoc = doc as IncidentDocument;

  return {
    _id: String(incidentDoc._id),
    service: incidentDoc.service,
    fingerprint: incidentDoc.fingerprint,
    count: incidentDoc.count ?? 0,
    priority: incidentDoc.priority ?? 1,
    status: incidentDoc.status ?? "open",
    lastSeen: incidentDoc.lastSeen instanceof Date 
      ? incidentDoc.lastSeen.toISOString() 
      : incidentDoc.lastSeen 
        ? new Date(incidentDoc.lastSeen).toISOString() 
        : null,
    firstSeen: incidentDoc.firstSeen instanceof Date
      ? incidentDoc.firstSeen.toISOString()
      : incidentDoc.firstSeen
        ? new Date(incidentDoc.firstSeen).toISOString()
        : null,
    sampleEventId: incidentDoc.sampleEventId ? String(incidentDoc.sampleEventId) : undefined,
    top_tags: incidentDoc.top_tags ?? [],
  };
}

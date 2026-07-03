/**
 * Type definitions for incidents domain
 */

import { ObjectId } from "mongodb";

export type PriorityFilter = "all" | "high" | "medium" | "low";
export type StatusFilter = "all" | "open" | "resolved";

export interface FilterState {
  searchQuery: string;
  status: StatusFilter;
  priority: PriorityFilter;
}

/**
 * Incident as returned from API (normalized)
 */
export interface Incident {
  _id: string;
  service: string;
  fingerprint: string;
  count: number;
  priority: number;
  status?: string;
  lastSeen?: string | null;
  firstSeen?: string | null;
  sampleEventId?: string;
  top_tags?: string[];
}

/**
 * MongoDB document structure (before normalization)
 */
export interface IncidentDocument {
  _id: ObjectId;
  service: string;
  fingerprint: string;
  count: number;
  priority: number;
  status?: string;
  lastSeen?: Date | null;
  firstSeen?: Date | null;
  sampleEventId?: ObjectId | string | null;
  top_tags?: string[];
}

/**
 * MongoDB query filter type
 */
export interface IncidentQueryFilter {
  status?: StatusFilter;
  priority?: {
    $gte?: number;
    $lte?: number;
  };
  service?: string;
  $or?: Array<{
    service?: { $regex: string; $options: string };
    fingerprint?: { $regex: string; $options: string };
  }>;
}

/**
 * MongoDB update document type
 */
export interface IncidentUpdateDocument {
  $set: {
    lastSeen: Date;
    status?: StatusFilter;
    priority?: number;
  };
}

/**
 * API response types
 */
export interface IncidentDetailResponse {
  ok: boolean;
  incident?: Incident;
  error?: string;
}

export type IncidentListResponse = Array<Incident>;

/**
 * API request body for creating/updating incidents
 */
export interface IncidentCreateRequest {
  service: string;
  priority?: number;
  fingerprint?: string;
  status?: string;
  top_tags?: string[];
  sampleEventId?: string;
}

export interface IncidentUpdateRequest {
  status?: StatusFilter;
  priority?: number;
}

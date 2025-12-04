/**
 * Type definitions for incidents domain
 */

export type PriorityFilter = "all" | "high" | "medium" | "low";
export type StatusFilter = "all" | "open" | "resolved";

export interface FilterState {
  searchQuery: string;
  status: StatusFilter;
  priority: PriorityFilter;
}

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

export interface IncidentDetailResponse {
  ok: boolean;
  incident?: Incident;
  error?: string;
}

export interface IncidentListResponse extends Array<Incident> {}

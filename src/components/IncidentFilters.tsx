"use client";

import { useEffect, useState } from "react";

export type PriorityFilter = "all" | "high" | "medium" | "low";
export type StatusFilter = "all" | "open" | "resolved";

export interface FilterState {
  searchQuery: string;
  status: StatusFilter;
  priority: PriorityFilter;
}

type Props = {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
};

export default function IncidentFilters({ filters, setFilters }: Props) {
  /* Local state only for search (for debounce) */
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.searchQuery);

  /* Debounce search input (300ms) */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  /* Push debounced search to parent */
  useEffect(() => {
    setFilters({
      ...filters,
      searchQuery: debouncedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  /* Direct update handlers for dropdowns/buttons */
  function updateStatus(v: StatusFilter) {
    setFilters({ ...filters, status: v });
  }

  function updatePriority(v: PriorityFilter) {
    setFilters({ ...filters, priority: v });
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      {/* Search Input */}
      <div className="flex-1">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search service or fingerprint..."
          className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Status Filter */}
      <div>
        <label htmlFor="status-select" className="sr-only">
            Status Filter
        </label>
        <select
            id="status-select"
            aria-label="Status Filter"
            value={filters.status}
            onChange={(e) => updateStatus(e.target.value as StatusFilter)}
            className="px-3 py-2 border rounded shadow-sm"
        >

          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Priority Filter Buttons */}
      <div className="flex gap-2">
        {(["all", "high", "medium", "low"] as PriorityFilter[]).map((level) => (
          <button
            key={level}
            onClick={() => updatePriority(level)}
            className={`px-3 py-2 rounded ${
              filters.priority === level
                ? level === "high"
                  ? "bg-red-600 text-white"
                  : level === "medium"
                  ? "bg-yellow-500 text-white"
                  : level === "low"
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-white"
                : "border"
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

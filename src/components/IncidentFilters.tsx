/**
 * Incident filters component
 * Fully controlled component with typed props
 * Prevents infinite re-renders with proper memoization
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FilterState, PriorityFilter, StatusFilter } from "@/types/incidents";

interface Props {
  filters: FilterState;
  setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
}

export default function IncidentFilters({ filters, setFilters }: Props) {
  // Local state for search input (debounced)
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local search with external filter changes (only when different)
  useEffect(() => {
    if (searchQuery !== filters.searchQuery) {
      setSearchQuery(filters.searchQuery);
    }
  }, [filters.searchQuery]); // Only depend on filters.searchQuery

  // Debounce search input (300ms) - prevent infinite loops
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const trimmed = value.trim();
      setFilters((prev) => {
        // Only update if value actually changed
        if (prev.searchQuery !== trimmed) {
          return {
            ...prev,
            searchQuery: trimmed,
          };
        }
        return prev;
      });
    }, 300);
  }, [setFilters]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handlers for filter updates - memoized to prevent re-renders
  const handleStatusChange = useCallback(
    (status: StatusFilter) => {
      setFilters((prev) => {
        // Only update if value actually changed
        if (prev.status !== status) {
          return {
            ...prev,
            status,
          };
        }
        return prev;
      });
    },
    [setFilters]
  );

  const handlePriorityChange = useCallback(
    (priority: PriorityFilter) => {
      setFilters((prev) => {
        // Only update if value actually changed
        if (prev.priority !== priority) {
          return {
            ...prev,
            priority,
          };
        }
        return prev;
      });
    },
    [setFilters]
  );

  // Priority button configuration - memoized
  const priorityOptions: Array<{ value: PriorityFilter; label: string; color: string }> = [
    { value: "all", label: "All", color: "bg-gray-600" },
    { value: "high", label: "High", color: "bg-red-600" },
    { value: "medium", label: "Medium", color: "bg-yellow-500" },
    { value: "low", label: "Low", color: "bg-green-600" },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      {/* Search Input */}
      <div className="flex-1">
        <label htmlFor="search-input" className="sr-only">
          Search incidents
        </label>
        <input
          id="search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search service or fingerprint..."
          className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
        />
      </div>

      {/* Status Filter */}
      <div className="flex-shrink-0">
        <label htmlFor="status-select" className="sr-only">
          Filter by status
        </label>
        <select
          id="status-select"
          value={filters.status}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Priority Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {priorityOptions.map((option) => {
          const isSelected = filters.priority === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePriorityChange(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSelected
                ? `${option.color} text-white shadow-sm`
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              {...(isSelected ? { "aria-pressed": "true" } : { "aria-pressed": "false" })}
              aria-label={`Filter by ${option.label.toLowerCase()} priority`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

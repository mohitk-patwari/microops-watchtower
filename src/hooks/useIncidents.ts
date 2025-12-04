/**
 * Custom hook for fetching and filtering incidents
 * Encapsulates SWR logic + filter state management
 */

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Incident, FilterState } from "@/types/incidents";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useIncidents(initialFilters?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: initialFilters?.searchQuery ?? "",
    status: initialFilters?.status ?? "all",
    priority: initialFilters?.priority ?? "all",
  });

  const [page, setPage] = useState(1);

  /**
   * Build query string from filters
   */
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.searchQuery) params.set("search", filters.searchQuery);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.priority !== "all") params.set("priority", filters.priority);
    params.set("page", page.toString());
    return `/api/incidents?${params.toString()}`;
  }, [filters, page]);

  const apiURL = buildQuery();

  /**
   * Fetch incidents with automatic refetch on filter/page change
   */
  const { data, error, isLoading, mutate } = useSWR(apiURL, fetcher, {
    refreshInterval: 5000,
    dedupingInterval: 2000,
  });

  const incidents: Incident[] = data ?? [];

  /**
   * Update an incident (e.g., resolve it)
   */
  const updateIncident = useCallback(
    async (id: string, updates: Partial<Incident>) => {
      try {
        const res = await fetch(`/api/incidents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update incident");
        }

        mutate(); // refresh the list
        return await res.json();
      } catch (err) {
        console.error("Failed to update incident:", err);
        throw err;
      }
    },
    [mutate]
  );

  return {
    incidents,
    filters,
    setFilters,
    page,
    setPage,
    isLoading,
    error,
    updateIncident,
    mutate,
  };
}

/**
 * Custom hook for fetching and filtering incidents
 * Encapsulates SWR logic + filter state management
 * Syncs filters with URL query parameters
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import { Incident, FilterState, IncidentUpdateRequest, PriorityFilter, StatusFilter } from "@/types/incidents";

/**
 * API response structure for incidents list
 */
interface IncidentListApiResponse {
  ok: boolean;
  data?: {
    incidents: Incident[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
  error?: string;
}

/**
 * API response structure for single incident
 */
interface IncidentDetailApiResponse {
  ok: boolean;
  data?: {
    incident: Incident;
  };
  error?: string;
}

/**
 * Validate and normalize filter values from URL params
 */
function validateFilterFromUrl(
  value: string | null,
  type: "status" | "priority"
): StatusFilter | PriorityFilter {
  if (type === "status") {
    if (value === "open" || value === "resolved") {
      return value as StatusFilter;
    }
    return "all";
  } else {
    if (value === "high" || value === "medium" || value === "low") {
      return value as PriorityFilter;
    }
    return "all";
  }
}

/**
 * Parse filters from URL search params
 */
function parseFiltersFromUrl(searchParams: URLSearchParams): FilterState {
  return {
    searchQuery: searchParams.get("search")?.trim() || "",
    status: validateFilterFromUrl(searchParams.get("status"), "status") as StatusFilter,
    priority: validateFilterFromUrl(searchParams.get("priority"), "priority") as PriorityFilter,
  };
}

/**
 * Serialize filters to URL search params
 */
function serializeFiltersToUrl(filters: FilterState, page: number): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filters.searchQuery) {
    params.set("search", filters.searchQuery);
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.priority !== "all") {
    params.set("priority", filters.priority);
  }
  if (page > 1) {
    params.set("page", page.toString());
  }
  
  return params;
}

/**
 * SWR fetcher function with proper typing
 */
const fetcher = async (url: string): Promise<Incident[]> => {
  const res = await fetch(url);
  const json: IncidentListApiResponse = await res.json();
  
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Failed to fetch incidents");
  }
  
  // Handle new API response format: { ok: true, data: { incidents: [...], pagination: {...} } }
  if (json.data?.incidents) {
    return json.data.incidents;
  }
  
  // Fallback for backward compatibility
  return Array.isArray(json.data) ? json.data : [];
};

/**
 * SWR configuration for incidents
 */
const swrConfig: SWRConfiguration<Incident[], Error> = {
  refreshInterval: 5000, // Auto-refresh every 5 seconds
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  revalidateOnFocus: true, // Revalidate when window gets focused
  revalidateOnReconnect: true, // Revalidate when network reconnects
  errorRetryCount: 3, // Retry failed requests up to 3 times
  errorRetryInterval: 5000, // Wait 5 seconds between retries
};

export interface UseIncidentsReturn {
  incidents: Incident[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: Error | undefined;
  updateIncident: (id: string, updates: IncidentUpdateRequest) => Promise<Incident>;
  mutate: () => Promise<Incident[] | undefined>;
}

export function useIncidents(initialFilters?: Partial<FilterState>): UseIncidentsReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize filters from URL params or initialFilters
  const initialFilterState = useMemo(() => {
    if (searchParams.toString()) {
      return parseFiltersFromUrl(searchParams);
    }
    return {
      searchQuery: initialFilters?.searchQuery ?? "",
      status: initialFilters?.status ?? "all",
      priority: initialFilters?.priority ?? "all",
    };
  }, []); // Only compute once on mount

  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  });

  // Sync filters to URL when they change
  useEffect(() => {
    const params = serializeFiltersToUrl(filters, page);
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    
    // Use replace to avoid adding to history on every filter change
    router.replace(newUrl, { scroll: false });
  }, [filters, page, pathname, router]);

  // Validate filter values before setting
  const setFiltersWithValidation = useCallback(
    (newFilters: FilterState | ((prev: FilterState) => FilterState)) => {
      setFilters((prev) => {
        const updated = typeof newFilters === "function" ? newFilters(prev) : newFilters;
        
        // Pre-validate filter values
        const validated: FilterState = {
          searchQuery: updated.searchQuery.trim().slice(0, 200), // Max 200 chars
          status: validateFilterFromUrl(updated.status, "status") as StatusFilter,
          priority: validateFilterFromUrl(updated.priority, "priority") as PriorityFilter,
        };
        
        return validated;
      });
    },
    []
  );

  // Validate and set page
  const setPageWithValidation = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  /**
   * Build query string from filters
   */
  const buildQuery = useCallback(() => {
    const params = serializeFiltersToUrl(filters, page);
    return `/api/incidents?${params.toString()}`;
  }, [filters, page]);

  const apiURL = buildQuery();

  /**
   * Fetch incidents with automatic refetch on filter/page change
   * Uses SWR for caching, revalidation, and error handling
   */
  const { data, error, isLoading, mutate } = useSWR<Incident[], Error>(
    apiURL,
    fetcher,
    swrConfig
  );

  const incidents: Incident[] = data ?? [];

  /**
   * Update an incident (e.g., resolve it)
   * Automatically triggers SWR revalidation after successful update
   */
  const updateIncident = useCallback(
    async (id: string, updates: IncidentUpdateRequest): Promise<Incident> => {
      // Pre-validate update request
      const validatedUpdates: IncidentUpdateRequest = {};
      
      if (updates.status !== undefined) {
        const status = String(updates.status).toLowerCase();
        if (status === "open" || status === "resolved") {
          validatedUpdates.status = status as "open" | "resolved";
        } else {
          throw new Error('Status must be "open" or "resolved"');
        }
      }
      
      if (updates.priority !== undefined) {
        const priority = Number(updates.priority);
        if (Number.isFinite(priority) && priority >= 1 && priority <= 10) {
          validatedUpdates.priority = Math.round(priority);
        } else {
          throw new Error("Priority must be a number between 1 and 10");
        }
      }

      try {
        const res = await fetch(`/api/incidents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedUpdates),
        });

        const json: IncidentDetailApiResponse = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to update incident");
        }

        if (!json.data?.incident) {
          throw new Error("Invalid response: missing incident data");
        }

        // Trigger SWR revalidation to refresh the list immediately
        await mutate();
        
        return json.data.incident;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update incident";
        throw new Error(errorMessage);
      }
    },
    [mutate]
  );

  return {
    incidents,
    filters,
    setFilters: setFiltersWithValidation,
    page,
    setPage: setPageWithValidation,
    isLoading,
    error,
    updateIncident,
    mutate,
  };
}

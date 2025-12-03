"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { FilterState } from "./IncidentFilters";

/* -------------------------------------------------
   INCIDENT INTERFACE
---------------------------------------------------*/
export interface Incident {
  _id: string;
  service: string;
  fingerprint: string;
  count: number;
  priority: number;
  status?: string;
  lastSeen?: string | null;
}

/* -------------------------------------------------
   PROPS
---------------------------------------------------*/
type Props = {
  filters: FilterState;
};

/* -------------------------------------------------
   SWR fetcher
---------------------------------------------------*/
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IncidentList({ filters }: Props) {
  /* -------------------------------------------------
     PAGINATION
  ---------------------------------------------------*/
  const [page, setPage] = useState(1);

  /* -------------------------------------------------
     Build query string (Filters + Pagination)
  ---------------------------------------------------*/
  function buildQuery() {
    const params = new URLSearchParams();

    if (filters.searchQuery) params.set("search", filters.searchQuery);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.priority !== "all") params.set("priority", filters.priority);

    params.set("page", page.toString()); // pagination

    return `/api/incidents?${params.toString()}`;
  }

  const apiURL = buildQuery();

  /* -------------------------------------------------
     SWR fetching
  ---------------------------------------------------*/
  const { data, error, isLoading, mutate } = useSWR(apiURL, fetcher, {
    refreshInterval: 5000,
    dedupingInterval: 2000,
  });

  const incidents: Incident[] = data ?? [];

  /* -------------------------------------------------
     PATCH Handler — Resolve Incident
  ---------------------------------------------------*/
  async function resolveIncident(id: string) {
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });

      if (!res.ok) throw new Error("Failed to update");

      mutate(); // refresh list immediately
    } catch (err: any) {
      alert("Resolve failed: " + (err.message || err));
    }
  }

  /* -------------------------------------------------
     Render States
  ---------------------------------------------------*/
  if (isLoading)
    return <div className="text-sm text-gray-500">Loading incidents...</div>;

  if (error)
    return <div className="text-sm text-red-600">Error loading incidents</div>;

  if (!incidents || incidents.length === 0)
    return <div className="text-sm text-gray-500">No incidents found.</div>;

  /* -------------------------------------------------
     FINAL UI
  ---------------------------------------------------*/
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {incidents.map((i) => (
          <div
            key={i._id}
            className="p-4 bg-white rounded-lg shadow-sm border hover:shadow transition"
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-semibold text-lg truncate">{i.service}</div>
                <div className="text-sm text-gray-500 truncate">
                  {i.fingerprint}
                </div>

                {i.lastSeen && (
                  <div className="text-xs text-gray-400 mt-1">
                    Last seen: {new Date(i.lastSeen).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="text-right ml-4">
                <div className="text-sm text-gray-500">Count</div>
                <div className="font-medium">{i.count}</div>

                <div className="mt-2">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      i.priority >= 7
                        ? "bg-red-100 text-red-800"
                        : i.priority >= 4
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {i.priority}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                className="text-sm px-3 py-1 rounded bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => alert(`Open incident ${i._id}`)}
              >
                Open
              </button>

              <button
                onClick={() => resolveIncident(i._id)}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded"
              >
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------
           PAGINATION BUTTONS
         ---------------------------------------------------- */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>

        <button
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </>
  );
}

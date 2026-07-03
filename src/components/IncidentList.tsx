/**
 * Incident list component with loading, empty, and error states
 * Displays incidents in a responsive grid layout
 */

"use client";

import IncidentCard from "./IncidentCard";
import { Incident } from "@/types/incidents";

interface Props {
  incidents: Incident[];
  isLoading: boolean;
  error: unknown;
  page: number;
  onPageChange: (p: number) => void;
  onResolve: (id: string) => Promise<void>;
  onError?: (error: string) => void;
}

export default function IncidentList({
  incidents,
  isLoading,
  error,
  page,
  onPageChange,
  onResolve,
  onError,
}: Props) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-sm text-gray-500">Loading incidents...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load incidents";
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md w-full">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">
                Error loading incidents
              </h3>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!incidents || incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No incidents found</h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Try adjusting your filters or check back later for new incidents.
        </p>
      </div>
    );
  }

  // Success state: Display incidents
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {incidents.map((incident) => (
          <IncidentCard
            key={incident._id}
            incident={incident}
            onResolve={onResolve}
            onError={onError}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          aria-label="Previous page"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page <span className="font-semibold">{page}</span>
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={incidents.length < 10}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </>
  );
}

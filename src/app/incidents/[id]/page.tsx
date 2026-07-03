/**
 * Incident detail page (client-side)
 * Fetches a single incident by ID
 */

"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Incident } from "@/types/incidents";
import Toast, { useToast } from "@/components/Toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function IncidentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const { toast, showError, showSuccess, closeToast } = useToast();

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/incidents/${id}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to fetch incident");
        }
        setIncident(json.data?.incident || json.data || json);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load incident";
        setError(errorMessage);
        showError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchIncident();
  }, [id, showError]);

  const handleResolve = async () => {
    if (!incident) return;
    try {
      setIsResolving(true);
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update");
      }
      setIncident(json.data?.incident || json.data || json);
      showSuccess("Incident resolved successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resolve incident";
      showError(errorMessage);
    } finally {
      setIsResolving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading incident...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !incident) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-red-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error ? "Error loading incident" : "Incident not found"}
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "The incident you're looking for doesn't exist."}
            </p>
            <Link
              href="/incidents"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Back to Incidents
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Success state: Display incident details
  return (
    <>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              href="/incidents"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Incidents
            </Link>
          </div>

          {/* Incident Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {incident.service}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Incident Details
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      incident.status === "resolved"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {incident.status || "open"}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      incident.priority >= 7
                        ? "bg-red-100 text-red-800"
                        : incident.priority >= 4
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    Priority {incident.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Fingerprint */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fingerprint
                  </label>
                  <p className="text-sm font-mono text-gray-900 break-all bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    {incident.fingerprint}
                  </p>
                </div>

                {/* Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Count
                  </label>
                  <p className="text-xl font-semibold text-gray-900">
                    {incident.count}
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <p className="text-xl font-semibold text-gray-900">
                    {incident.priority}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {incident.status || "open"}
                  </p>
                </div>

                {/* Last Seen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Seen
                  </label>
                  <p className="text-sm text-gray-900">
                    {incident.lastSeen
                      ? new Date(incident.lastSeen).toLocaleString()
                      : "N/A"}
                  </p>
                </div>

                {/* First Seen */}
                {incident.firstSeen && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Seen
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(incident.firstSeen).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {incident.top_tags && incident.top_tags.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {incident.top_tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              {incident.status !== "resolved" && (
                <button
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isResolving ? "Resolving..." : "Resolve Incident"}
                </button>
              )}
              <Link
                href="/incidents"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}

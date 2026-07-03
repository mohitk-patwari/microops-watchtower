/**
 * Reusable incident card component
 * Displays incident information with actions
 */

"use client";

import { useRouter } from "next/navigation";
import { Incident } from "@/types/incidents";

interface Props {
  incident: Incident;
  onResolve: (id: string) => Promise<void>;
  onError?: (error: string) => void;
}

export default function IncidentCard({ incident, onResolve, onError }: Props) {
  const router = useRouter();

  const handleOpen = () => {
    router.push(`/incidents/${incident._id}`);
  };

  const handleResolve = async () => {
    try {
      await onResolve(incident._id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resolve incident";
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // Priority badge color mapping
  const getPriorityBadgeClass = (priority: number) => {
    if (priority >= 7) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    if (priority >= 4) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    return "bg-green-100 text-green-800 border-green-200";
  };

  // Status badge color mapping
  const getStatusBadgeClass = (status?: string) => {
    if (status === "resolved") {
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start gap-4">
        {/* Left: Service Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {incident.service}
            </h3>
            {incident.status && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadgeClass(
                  incident.status
                )}`}
              >
                {incident.status}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate font-mono">
            {incident.fingerprint}
          </p>
          {incident.lastSeen && (
            <p className="text-xs text-gray-400 mt-1">
              Last seen: {new Date(incident.lastSeen).toLocaleString()}
            </p>
          )}
        </div>

        {/* Right: Metrics */}
        <div className="text-right flex-shrink-0">
          <div className="mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Count</p>
            <p className="text-lg font-semibold text-gray-900">{incident.count}</p>
          </div>
          <div
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${getPriorityBadgeClass(
              incident.priority
            )}`}
          >
            Priority {incident.priority}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={handleOpen}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          View Details
        </button>
        {incident.status !== "resolved" && (
          <button
            onClick={handleResolve}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
            aria-label="Resolve incident"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}

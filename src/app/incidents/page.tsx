/**
 * Incidents list page (client-side)
 * Uses useIncidents hook for filtering + fetching
 * Filters are synced with URL query parameters
 */

"use client";

import { Suspense } from "react";
import IncidentFilters from "@/components/IncidentFilters";
import IncidentList from "@/components/IncidentList";
import Toast, { useToast } from "@/components/Toast";
import { useIncidents } from "@/hooks/useIncidents";

function IncidentsPageContent() {
  const {
    incidents,
    filters,
    setFilters,
    page,
    setPage,
    isLoading,
    error,
    updateIncident,
  } = useIncidents();

  const { toast, showError, showSuccess, closeToast } = useToast();

  const handleResolve = async (id: string) => {
    try {
      await updateIncident(id, { status: "resolved" });
      showSuccess("Incident resolved successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resolve incident";
      showError(errorMessage);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Incidents</h1>
            <p className="text-gray-600">
              Real-time incident groups and triage center
            </p>
          </header>

          {/* Filters and List */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <IncidentFilters filters={filters} setFilters={setFilters} />

            <IncidentList
              incidents={incidents}
              isLoading={isLoading}
              error={error}
              page={page}
              onPageChange={setPage}
              onResolve={handleResolve}
              onError={showError}
            />
          </section>
        </div>
      </main>

      {/* Toast Notification */}
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading incidents...</p>
        </div>
      </main>
    }>
      <IncidentsPageContent />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import IncidentFilters from "./IncidentFilters";
import IncidentList from "./IncidentList";
import Toast, { useToast } from "./Toast";
import { useIncidents } from "@/hooks/useIncidents";

function DashboardContent() {
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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resolve incident";
      showError(errorMessage);
    }
  };

  return (
    <>
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Incident Dashboard</h1>
              <p className="text-sm text-gray-600">
                Real-time incident groups and triage center.
              </p>
            </div>

            <div className="text-sm text-gray-500">
              <div>Total Incidents</div>
              <div className="text-lg font-semibold">—</div>
            </div>
          </header>

          <section>
            <h2 className="text-lg font-medium mb-3">Incidents</h2>

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

      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

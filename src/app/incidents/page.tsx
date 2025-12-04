/**
 * Incidents list page (client-side)
 * Uses useIncidents hook for filtering + fetching
 */

"use client";

import { useState } from "react";
import IncidentFilters from "@/components/IncidentFilters";
import IncidentList from "@/components/IncidentListRefactored";
import { useIncidents } from "@/hooks/useIncidents";

export default function IncidentsPage() {
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

    const handleResolve = async (id: string) => {
        await updateIncident(id, { status: "resolved" });
    };

    return (
        <main className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold">Incidents</h1>
                    <p className="text-gray-600">
                        Real-time incident groups and triage center
                    </p>
                </header>

                <section className="bg-white p-4 rounded-lg shadow-sm">
                    <IncidentFilters filters={filters} setFilters={setFilters} />

                    <IncidentList
                        incidents={incidents}
                        isLoading={isLoading}
                        error={error}
                        page={page}
                        onPageChange={setPage}
                        onResolve={handleResolve}
                    />
                </section>
            </div>
        </main>
    );
}

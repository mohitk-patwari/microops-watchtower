// src/components/Dashboard.tsx
"use client";

import React, { useState } from "react";
import IncidentFilters, { FilterState } from "./IncidentFilters";
import IncidentList from "./IncidentList";

export default function Dashboard() {
    // Centralized filter state
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: "",
        status: "all",
        priority: "all",
    });

    return (
        <main className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header Section */}
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Incident Dashboard</h1>
                        <p className="text-sm text-gray-600">
                            Real-time incident groups and triage center.
                        </p>
                    </div>

                    {/* Placeholder for real-time counts */}
                    <div className="text-sm text-gray-500">
                        <div>Total Incidents</div>
                        <div className="text-lg font-semibold">—</div>
                    </div>
                </header>

                {/* Main Body */}
                <section>
                    <h2 className="text-lg font-medium mb-3">Incidents</h2>

                    {/* Filters */}
                    <IncidentFilters 
                    filters={filters} 
                    setFilters={setFilters} />

                    {/* Incident List */}
                    <IncidentList filters={filters} />
                </section>
            </div>
        </main>
    );
}

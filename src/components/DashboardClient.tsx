"use client";

import { useState } from "react";
import IncidentFilters, { FilterState } from "./IncidentFilters";
import IncidentList from "./IncidentList";

export default function DashboardClient() {
    const [filters, setFilters] = useState<FilterState>({ searchQuery: "", status: "all", priority: "all" });

    return (
        <div>
            <IncidentFilters
                filters={filters}
                setFilters={setFilters}
            />
            <IncidentList filters={filters} />
        </div>
    );
}
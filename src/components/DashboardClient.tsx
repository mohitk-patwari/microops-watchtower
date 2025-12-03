"use client";

import { useState } from "react";
import IncidentFilters, { FilterState } from "./IncidentFilters";
import IncidentList from "./IncidentList";

export default function DashboardClient() {
    const [filters,setFilters] = useState<FilterState>({ searchQuery: "",status:"all",priority:"all"});

    return (
        <div>
            <IncidentFilters    
                initial={filters}
                onFilterChange={(f) => {
                    setFilters(f);
                }}
            />
            <IncidentList filters={filters} />
        </div>
    );
}
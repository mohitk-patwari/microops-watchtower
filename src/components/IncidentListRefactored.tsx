/**
 * Refactored IncidentList using the new IncidentCard component
 * Removes duplicate card rendering logic
 */

"use client";

import IncidentCard from "./IncidentCard";
import { Incident } from "@/types/incidents";

interface Props {
    incidents: Incident[];
    isLoading: boolean;
    error: any;
    page: number;
    onPageChange: (p: number) => void;
    onResolve: (id: string) => Promise<void>;
}

export default function IncidentList({
    incidents,
    isLoading,
    error,
    page,
    onPageChange,
    onResolve,
}: Props) {
    if (isLoading)
        return <div className="text-sm text-gray-500">Loading incidents...</div>;

    if (error)
        return <div className="text-sm text-red-600">Error loading incidents</div>;

    if (!incidents || incidents.length === 0)
        return <div className="text-sm text-gray-500">No incidents found.</div>;

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {incidents.map((incident) => (
                    <IncidentCard
                        key={incident._id}
                        incident={incident}
                        onResolve={onResolve}
                    />
                ))}
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <button
                    disabled={page === 1}
                    onClick={() => onPageChange(page - 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    Previous
                </button>

                <button
                    onClick={() => onPageChange(page + 1)}
                    className="px-3 py-1 border rounded"
                >
                    Next
                </button>
            </div>
        </>
    );
}

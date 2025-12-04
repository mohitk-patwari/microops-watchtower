/**
 * Incident detail page (client-side)
 * Fetches a single incident by ID
 */

"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Incident } from "@/types/incidents";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function IncidentDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [incident, setIncident] = useState<Incident | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        const fetchIncident = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`/api/incidents/${id}`);
                if (!res.ok) throw new Error("Failed to fetch incident");
                const data = await res.json();
                setIncident(data.incident || data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchIncident();
    }, [id]);

    const handleResolve = async () => {
        if (!incident) return;
        try {
            setIsResolving(true);
            const res = await fetch(`/api/incidents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "resolved" }),
            });
            if (!res.ok) throw new Error("Failed to update");
            const updated = await res.json();
            setIncident(updated.incident || updated);
        } catch (err: any) {
            alert("Failed to resolve: " + err.message);
        } finally {
            setIsResolving(false);
        }
    };

    if (isLoading)
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </main>
        );

    if (error)
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">Error: {error}</div>
            </main>
        );

    if (!incident)
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">Incident not found</div>
            </main>
        );

    return (
        <main className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="mb-4 px-3 py-1 border rounded hover:bg-gray-100"
                >
                    ← Back
                </button>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <h1 className="text-3xl font-bold mb-4">{incident.service}</h1>

                    <div className="grid gap-4 mb-6">
                        <div>
                            <label className="text-sm text-gray-600">Fingerprint</label>
                            <p className="text-lg font-mono break-all">{incident.fingerprint}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600">Count</label>
                                <p className="text-xl font-semibold">{incident.count}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Priority</label>
                                <p className="text-xl font-semibold">{incident.priority}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600">Status</label>
                                <p className="text-lg font-semibold capitalize">
                                    {incident.status || "open"}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Last Seen</label>
                                <p className="text-sm">
                                    {incident.lastSeen
                                        ? new Date(incident.lastSeen).toLocaleString()
                                        : "N/A"}
                                </p>
                            </div>
                        </div>

                        {incident.firstSeen && (
                            <div>
                                <label className="text-sm text-gray-600">First Seen</label>
                                <p className="text-sm">
                                    {new Date(incident.firstSeen).toLocaleString()}
                                </p>
                            </div>
                        )}

                        {incident.top_tags && incident.top_tags.length > 0 && (
                            <div>
                                <label className="text-sm text-gray-600">Tags</label>
                                <div className="flex gap-2 mt-1">
                                    {incident.top_tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {incident.status !== "resolved" && (
                            <button
                                onClick={handleResolve}
                                disabled={isResolving}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                {isResolving ? "Resolving..." : "Resolve"}
                            </button>
                        )}
                        <button
                            onClick={() => router.push("/incidents")}
                            className="px-4 py-2 border rounded hover:bg-gray-100"
                        >
                            Back to List
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

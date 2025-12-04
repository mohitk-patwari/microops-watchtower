/**
 * Reusable incident card component
 */

import { useRouter } from "next/navigation";
import { Incident } from "@/types/incidents";

interface Props {
    incident: Incident;
    onResolve: (id: string) => Promise<void>;
}

export default function IncidentCard({ incident, onResolve }: Props) {
    const router = useRouter();

    const handleOpen = () => {
        router.push(`/incidents/${incident._id}`);
    };

    const handleResolve = async () => {
        try {
            await onResolve(incident._id);
        } catch (err: any) {
            alert("Resolve failed: " + (err.message || err));
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-sm border hover:shadow transition">
            <div className="flex justify-between items-start">
                <div className="min-w-0">
                    <div className="font-semibold text-lg truncate">{incident.service}</div>
                    <div className="text-sm text-gray-500 truncate">{incident.fingerprint}</div>

                    {incident.lastSeen && (
                        <div className="text-xs text-gray-400 mt-1">
                            Last seen: {new Date(incident.lastSeen).toLocaleString()}
                        </div>
                    )}
                </div>

                <div className="text-right ml-4">
                    <div className="text-sm text-gray-500">Count</div>
                    <div className="font-medium">{incident.count}</div>

                    <div className="mt-2">
                        <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${incident.priority >= 7
                                    ? "bg-red-100 text-red-800"
                                    : incident.priority >= 4
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                }`}
                        >
                            {incident.priority}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex gap-2">
                <button
                    onClick={handleOpen}
                    className="text-sm px-3 py-1 rounded bg-sky-600 text-white hover:bg-sky-700"
                >
                    Open
                </button>

                <button
                    onClick={handleResolve}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                    Resolve
                </button>
            </div>
        </div>
    );
}

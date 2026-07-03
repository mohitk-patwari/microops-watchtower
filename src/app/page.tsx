import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">MicroOps Watchtower</h1>
        <p className="text-lg text-gray-600">
          Real-time incident monitoring and triage center
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/incidents"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            View Incidents
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

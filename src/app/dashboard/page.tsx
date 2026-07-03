// src/app/dashboard/page.tsx

import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";

export default function Page() {
  return (

    <Suspense fallback={
      <main className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </main>
    }>
      <Dashboard />
    </Suspense>
  );
}

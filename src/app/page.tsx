"use client";
import Header from"../components/Header";

import { useEffect,useState } from "react";


// export default function Home(){
//   const [metrics, setMetrics] = useState<any>(null);

//   //Fetch data from /api/metrics when page loads
//   useEffect(() => {
//     async function fetchMetrics(){
//       const res = await fetch("/api/metrics");
//       const data = await res.json();
//       setMetrics(data);
//     }
//     fetchMetrics();
//   },[]);
//   return (
//     <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
//       <h1 className="text-3xl font-bold mb-4">MicroOps Watchtower</h1>
//       {metrics ? (
//         <div className="bg-white p-4 rounded shadow-md">
//           <p><strong>CPU:</strong>{metrics.cpu}</p>
//           <p><strong>Memory:</strong>{metrics.memory}</p>
//           <p><strong>Status:</strong>{metrics.status}</p>
//         </div>
//       ) : (
//         <p>Loading metrics...</p>
//       )}
//     </main>
//   );
// }

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="p-6 max-w-sm mx-auto bg-white rounded-2xl shadow-md space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Tailwind CSS Test
        </h1>
        <p className="text-gray-600 text-center">
          If this card looks styled, Tailwind CSS is working!
        </p>
        <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Test Button
        </button>
      </div>
    </main>
  );
}

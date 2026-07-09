// scripts/simulate-traffic.js
//
// Hits the demo-service's buggy routes with randomized user/order/token
// values at randomized intervals, so watchtower receives an organic stream
// of errors over time instead of one identical burst.
//
// Run: node scripts/simulate-traffic.js
// (make sure demo-service and the Next.js app are both running first)

const DEMO_BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:4000";

const routes = [
  () => `/pay/user-${1000 + Math.floor(Math.random() * 500)}`,
  () => `/db/order-${5000 + Math.floor(Math.random() * 2000)}`,
  (i) => `/auth/${Math.random() < 0.5 ? "valid-token" : "bad-token-" + i}`,
];

function randomDelay(minMs = 300, maxMs = 2000) {
  return minMs + Math.random() * (maxMs - minMs);
}

async function fireOne(i) {
  const route = routes[Math.floor(Math.random() * routes.length)](i);
  try {
    const res = await fetch(`${DEMO_BASE_URL}${route}`);
    const status = res.status;
    console.log(`[${i}] GET ${route} -> ${status}`);
  } catch (err) {
    console.error(`[${i}] request failed:`, err.message);
  }
}

async function run() {
  console.log(`Simulating traffic against ${DEMO_BASE_URL} (Ctrl+C to stop)`);
  let i = 0;
  for (;;) {
    await fireOne(i++);
    await new Promise((r) => setTimeout(r, randomDelay()));
  }
}

run().catch(console.error);

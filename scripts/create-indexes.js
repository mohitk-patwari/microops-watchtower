// scripts/create-indexes.js
//
// Run once (and again any time indexes change): `node scripts/create-indexes.js`
//
// Fixes three real problems in the original project:
// 1. No unique index on `fingerprint` -> concurrent first-events for a brand
//    new bug could race and create TWO incidents for the same fingerprint.
//    A unique index makes Mongo enforce one-incident-per-fingerprint itself.
// 2. No index backing the list query's sort/filter (status, priority,
//    lastSeen) -> full collection scans as data grows.
// 3. `events` collection grows forever with no cleanup -> TTL index makes
//    Mongo auto-delete raw events after 30 days, which is standard practice
//    for high-volume, low-value-per-record data like raw error events.

import { connectScriptDb } from "./lib/db.js";

async function main() {
  const { client, db } = await connectScriptDb();

  // --- incidents collection ---
  await db.collection("incidents").createIndex(
    { fingerprint: 1 },
    { unique: true, name: "uniq_fingerprint" }
  );
  console.log("Created unique index: incidents.fingerprint");

  await db.collection("incidents").createIndex(
    { status: 1, priority: -1, lastSeen: -1 },
    { name: "status_priority_lastSeen" }
  );
  console.log("Created compound index: incidents.(status, priority, lastSeen)");

  await db.collection("incidents").createIndex(
    { service: 1 },
    { name: "service_idx" }
  );
  console.log("Created index: incidents.service");

  // --- events collection ---
  await db.collection("events").createIndex(
    { fingerprint: 1, receivedAt: -1 },
    { name: "fingerprint_receivedAt" }
  );
  console.log("Created index: events.(fingerprint, receivedAt)");

  // TTL index: Mongo will automatically delete documents once receivedAt
  // is older than 30 days. This caps unbounded growth of raw event storage.
  await db.collection("events").createIndex(
    { receivedAt: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 30, name: "ttl_30d" }
  );
  console.log("Created TTL index: events.receivedAt (30 day expiry)");

  console.log("\nAll indexes created successfully.");
  await client.close();
}

main().catch((err) => {
  console.error("Failed to create indexes:", err);
  process.exit(1);
});

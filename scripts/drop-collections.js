// scripts/drop-collections.js
//
// Drops the `incidents` and `events` collections so you can start clean
// before create-indexes.js — useful if old data (created under the naive,
// non-normalized fingerprinting) has duplicate fingerprints, which makes
// the unique index on incidents.fingerprint fail to build.
//
// Destructive. Requires --yes to actually run.
// Run: node scripts/drop-collections.js --yes

import { connectScriptDb } from "./lib/db.js";

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(
      "Refusing to run without --yes. This permanently deletes all documents\n" +
        "in the `incidents` and `events` collections. Re-run as:\n" +
        "  node scripts/drop-collections.js --yes"
    );
    process.exit(1);
  }

  const { client, db } = await connectScriptDb();

  for (const name of ["incidents", "events"]) {
    const result = await db.collection(name).deleteMany({});
    console.log(`Dropped ${result.deletedCount} document(s) from "${name}"`);
  }

  console.log("\nDone. Run create-indexes.js next.");
  await client.close();
}

main().catch((err) => {
  console.error("Failed to drop collections:", err);
  process.exit(1);
});

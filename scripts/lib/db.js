// scripts/lib/db.js
//
// Shared Mongo bootstrap for one-off scripts (create-indexes.js,
// drop-collections.js): read MONGODB_URI/MONGODB_DB from .env.local and
// connect. Returns the client too so callers are responsible for closing it.

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export async function connectScriptDb() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "microops";

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local first.");
  }

  const client = new MongoClient(uri);
  await client.connect();
  console.log(`Connected to Mongo, using db "${dbName}"`);

  return { client, db: client.db(dbName) };
}

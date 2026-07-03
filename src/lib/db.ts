import { MongoClient, Db, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB ?? "microops";

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;

if (!global._mongoClientPromise) {
  // Add sensible timeouts so connection attempts fail fast in dev/CI
  const mongoOptions: Record<string, unknown> = {
    // How long to wait to find a suitable server (ms)
    serverSelectionTimeoutMS: 5000,
    // How long to wait for TCP connect (ms)
    connectTimeoutMS: 5000,
    // Socket inactivity timeout (ms)
    socketTimeoutMS: 45000,
  };

  // MongoDB Atlas requires TLS/SSL by default
  // Check if this is an Atlas connection (mongodb.net or mongodb+srv://)
  const isAtlasConnection = uri.includes("mongodb.net") || uri.startsWith("mongodb+srv://");
  
  if (isAtlasConnection) {
    // Enable TLS for Atlas connections
    Object.assign(mongoOptions, {
      tls: true,
    });
  }

  // Allow opting out of strict TLS certificate validation by setting
  // MONGODB_TLS_ALLOW_INVALID=true in your .env during development when
  // connecting to self-signed MongoDB servers. Do NOT enable in production.
  if (process.env.MONGODB_TLS_ALLOW_INVALID === "true") {
    Object.assign(mongoOptions, {
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    console.warn("MongoDB: TLS certificate validation is disabled (MONGODB_TLS_ALLOW_INVALID=true)");
  }

  client = new MongoClient(uri, mongoOptions as MongoClientOptions);
  global._mongoClientPromise = client.connect();
}

const clientPromise: Promise<MongoClient> = global._mongoClientPromise;

export async function connectToDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    return client.db(dbName);
  } catch (err) {
    // surface a clearer error when the DB connection fails
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`MONGODB_CONNECT_ERROR: ${msg}`);
  }
}

export default clientPromise;


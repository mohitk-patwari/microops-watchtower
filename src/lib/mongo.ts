import clientPromise from '../../lib/db';
import { Db } from 'mongodb';

const dbName = process.env.MONGODB_DB ?? 'microops';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

export async function connectToDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

// Keep a default export for backward compatibility
export default connectToDatabase;
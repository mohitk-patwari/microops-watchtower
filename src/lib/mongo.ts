import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {};
const dbName = process.env.MONGODB_DB ?? 'microops';

if(!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if(process.env.NODE_ENV === 'development') {
    // Resue connection in development to avoid multiple instances
    if(!(global as any)._mongoClientPromise) {
        client = new MongoClient(uri, options);
        (global as any)._mongoClientPromise = client.connect();
    }
    clientPromise = (global as any)._mongoClientPromise;
}else{
    // In production, create a new connection
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export async function connectToDatabase(): Promise<Db>{
    const client = await clientPromise;
    return client.db(dbName);
}

// Optional: export clientPromise if some routes use it directly
export default clientPromise;
import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = cachedClient ?? new MongoClient(MONGODB_URI);

  if (!cachedClient) {
    await client.connect();
    cachedClient = client;
  }

  cachedDb = client.db("sweepstake");
  return cachedDb;
}

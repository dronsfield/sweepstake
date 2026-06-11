import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let indexesEnsured = false;

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;

  const col = db.collection("participants");

  // Check for existing duplicate teams before creating unique indexes
  for (const field of ["topTierTeam.name", "bottomTierTeam.name"] as const) {
    const dupes = await col
      .aggregate([
        { $group: { _id: { group: "$group", team: `$${field}` }, count: { $sum: 1 }, names: { $push: "$name" } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (dupes.length > 0) {
      console.warn(
        `[sweepstake] Duplicate ${field} assignments found — skipping unique team indexes. Resolve manually:`,
        dupes.map((d) => ({ group: d._id.group, team: d._id.team, names: d.names }))
      );
      // Still create the name uniqueness index, skip team indexes
      await col.createIndex({ group: 1, name: 1 }, { unique: true });
      indexesEnsured = true;
      return;
    }
  }

  await Promise.all([
    col.createIndex({ group: 1, name: 1 }, { unique: true }),
    col.createIndex({ group: 1, "topTierTeam.name": 1 }, { unique: true }),
    col.createIndex({ group: 1, "bottomTierTeam.name": 1 }, { unique: true }),
  ]);

  indexesEnsured = true;
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = cachedClient ?? new MongoClient(MONGODB_URI);

  if (!cachedClient) {
    await client.connect();
    cachedClient = client;
  }

  cachedDb = client.db("sweepstake");
  await ensureIndexes(cachedDb);
  return cachedDb;
}

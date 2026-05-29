import { MongoClient, Db } from 'mongodb';

const DB_NAME = process.env.DB_NAME || 'hexagon_db';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(DB_NAME);
  // Create indexes on first connection
  await createIndexes(cachedDb);
  return cachedDb;
}

async function createIndexes(db: Db) {
  // users
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });
  // ideas
  await db.collection('ideas').createIndex({ slug: 1 }, { unique: true });
  await db.collection('ideas').createIndex({ category: 1 });
  await db.collection('ideas').createIndex({ status: 1 });
  await db.collection('ideas').createIndex({ user_id: 1 });
  await db.collection('ideas').createIndex({ created_at: -1 });
  // votes
  await db.collection('votes').createIndex({ user_id: 1, idea_id: 1 }, { unique: true });
  await db.collection('votes').createIndex({ idea_id: 1 });
  // comments
  await db.collection('comments').createIndex({ idea_id: 1 });
  await db.collection('comments').createIndex({ user_id: 1 });
  await db.collection('comments').createIndex({ parent_id: 1 });
  // institutional_interests
  await db.collection('institutional_interests').createIndex({ institution_id: 1, idea_id: 1 }, { unique: true });
  await db.collection('institutional_interests').createIndex({ idea_id: 1 });
}

// Helper to serialize MongoDB documents (convert ObjectId to string, Date to ISO)
// Always outputs both `_id` and `id` so frontend can rely on `id`
export function serializeDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};
  for (const key in doc) {
    const value = doc[key];
    if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (value && typeof value === 'object' && (value as { _id?: unknown })._id) {
      // Nested document — check for ObjectId
      if (value.toString && value.toString().includes('ObjectId')) {
        serialized[key] = (value as { toString(): string }).toString();
      } else {
        serialized[key] = value;
      }
    } else if (Array.isArray(value)) {
      serialized[key] = value.map(item =>
        item && typeof item === 'object' ? serializeDoc(item as Record<string, unknown>) : item
      );
    } else if (key === '_id' && value) {
      const idStr = (value as { toString(): string }).toString();
      serialized[key] = idStr;
      // Always also expose as `id` for frontend compatibility
      serialized['id'] = idStr;
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

// Serialize an array of documents
export function serializeDocs(docs: Record<string, unknown>[]): Record<string, unknown>[] {
  return docs.map(serializeDoc);
}

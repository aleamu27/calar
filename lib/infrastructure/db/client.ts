/**
 * Database Client
 * Singleton Drizzle instance with connection pooling.
 * Lazy-loaded to avoid build-time errors when DATABASE_URL is not set.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

function getDb() {
  if (globalForDb.db) {
    return globalForDb.db;
  }

  const pool = globalForDb.pool ?? createPool();

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.pool = pool;
  }

  const db = drizzle(pool, { schema });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
  }

  return db;
}

// Export a proxy that lazy-loads the database
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

export type Database = ReturnType<typeof drizzle<typeof schema>>;

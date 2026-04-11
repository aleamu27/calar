/**
 * Drizzle Kit Configuration
 * Used for migrations and schema introspection.
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/infrastructure/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;

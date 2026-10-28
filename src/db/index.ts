import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Reuse the pool across hot reloads in development.
  var __kcpersonalPool: Pool | undefined;
}

const pool =
  globalThis.__kcpersonalPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== "production") globalThis.__kcpersonalPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;

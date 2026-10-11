import "server-only";
import { Pool } from "pg";

export type Row = Record<string, unknown>;

// Cached on globalThis so dev hot reloads reuse one pool.
const globalForDb = globalThis as unknown as { docsPool?: Pool };

function pool(): Pool {
  return (globalForDb.docsPool ??= new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgres://localhost:5432/docs_app_db",
  }));
}

/** The only function that talks to PostgreSQL; repositories build on it. */
export async function query(
  text: string,
  values: unknown[] = [],
): Promise<Row[]> {
  return (await pool().query(text, values)).rows;
}

export function toMs(value: unknown): number {
  return value instanceof Date ? value.getTime() : 0;
}

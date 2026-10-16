// ─────────────────────────────────────────────────────────────────────────────
// Postgres on Neon. node-postgres pool, pooled DATABASE_URL (PgBouncer),
// attached to Vercel Fluid compute so idle connections close with the function.
// Raw SQL on purpose. Migrations: scripts/migrate.mjs over DATABASE_URL_UNPOOLED.
// ─────────────────────────────────────────────────────────────────────────────

import { Pool, type QueryResultRow } from "pg";
import { attachDatabasePool } from "@vercel/functions";

declare global {
  // Survives HMR in dev so we do not leak a pool per reload.
  var __tfpPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Run `neon env pull` or set it in Vercel.");
  }
  const pool = new Pool({
    connectionString,
    // Lab attacks run up to 40 requests in flight on purpose; PgBouncer on the
    // Neon side multiplexes these onto far fewer server connections.
    max: 40,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error", err);
  });
  attachDatabasePool(pool);
  return pool;
}

export function getPool(): Pool {
  if (!globalThis.__tfpPool) globalThis.__tfpPool = createPool();
  return globalThis.__tfpPool;
}

/** One-shot query. For transactions use `withTx`. */
export async function sql<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await getPool().query<T>(text, params);
  return rows;
}

/** Runs `fn` inside BEGIN/COMMIT on a single client. Rolls back on throw. */
export async function withTx<T>(
  fn: (q: <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<R[]>) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const q = async <R extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) =>
      (await client.query<R>(text, params)).rows;
    const result = await fn(q);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

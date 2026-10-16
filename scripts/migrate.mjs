// Applies db/migrations/*.sql in filename order, once each, in a transaction.
// Uses the direct (unpooled) connection: migrations need session state that
// PgBouncer transaction mode does not keep.
//
//   npm run db:migrate            # apply pending
//   npm run db:migrate -- --status

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.");
  process.exit(1);
}
if (url.includes("-pooler.")) {
  console.warn("warning: running migrations over a pooled connection string");
}

const dir = join(process.cwd(), "db", "migrations");
const statusOnly = process.argv.includes("--status");

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const applied = new Set(
    (await client.query("SELECT name FROM public.schema_migrations")).rows.map((r) => r.name)
  );
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  if (statusOnly) {
    for (const f of files) console.log(`${applied.has(f) ? "applied" : "pending"}  ${f}`);
    process.exit(0);
  }

  let n = 0;
  for (const f of files) {
    if (applied.has(f)) continue;
    const text = await readFile(join(dir, f), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(text);
      await client.query("INSERT INTO public.schema_migrations (name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`applied  ${f}`);
      n++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`failed   ${f}`);
      throw err;
    }
  }
  console.log(n === 0 ? "nothing to apply" : `${n} migration(s) applied`);
} finally {
  await client.end();
}

// Loads content/northwind/*.md into rag.docs and rag.chunks (both chunking strategies),
// then embeds every chunk that has no embedding yet. Safe to rerun.
//
//   node --env-file=.env.local scripts/rag-ingest.mjs

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import { chunkDoc, parseDoc } from "../lib/rag/chunk.ts";
import { embed, toVector } from "../lib/rag/voyage.ts";

const dir = join(process.cwd(), "content", "northwind");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL });
await client.connect();

try {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const docs = await Promise.all(files.map(async (f) => parseDoc(f.replace(/\.md$/, ""), await readFile(join(dir, f), "utf8"))));

  await client.query("BEGIN");
  await client.query("DELETE FROM rag.docs WHERE NOT (slug = ANY($1))", [docs.map((d) => d.slug)]);
  for (const d of docs) {
    const prev = await client.query("SELECT body, title, status, updated::text FROM rag.docs WHERE slug = $1", [d.slug]);
    const same = prev.rows[0] && prev.rows[0].body === d.body && prev.rows[0].title === d.title && prev.rows[0].status === d.status && prev.rows[0].updated === d.updated;
    if (same) continue;
    await client.query(
      `INSERT INTO rag.docs (slug, title, updated, status, body) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, updated = EXCLUDED.updated, status = EXCLUDED.status, body = EXCLUDED.body`,
      [d.slug, d.title, d.updated, d.status, d.body]
    );
    await client.query("DELETE FROM rag.chunks WHERE doc_slug = $1", [d.slug]);
    for (const c of chunkDoc(d)) {
      await client.query("INSERT INTO rag.chunks (strategy, doc_slug, ord, heading, text, tokens) VALUES ($1, $2, $3, $4, $5, $6)", [c.strategy, c.docSlug, c.ord, c.heading, c.text, c.tokens]);
    }
    console.log(`loaded   ${d.slug}`);
  }
  await client.query("COMMIT");

  const todo = (await client.query("SELECT id, heading, text FROM rag.chunks WHERE embedding IS NULL ORDER BY id")).rows;
  if (todo.length && !process.env.VOYAGE_API_KEY) {
    console.warn(`${todo.length} chunks without embeddings; set VOYAGE_API_KEY and rerun`);
  } else {
    let tokens = 0;
    for (let i = 0; i < todo.length; i += 100) {
      const batch = todo.slice(i, i + 100);
      const r = await embed(batch.map((c) => (c.heading ? `${c.heading}\n${c.text}` : c.text)), "document");
      tokens += r.tokens;
      for (let j = 0; j < batch.length; j++) await client.query("UPDATE rag.chunks SET embedding = $1 WHERE id = $2", [toVector(r.vectors[j]), batch[j].id]);
    }
    if (todo.length) console.log(`embedded ${todo.length} chunks, ${tokens} tokens`);
  }

  const s = (await client.query("SELECT strategy, count(*)::int n, count(embedding)::int e, round(avg(tokens))::int t FROM rag.chunks GROUP BY 1 ORDER BY 1")).rows;
  console.table(s);
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  await client.end();
}

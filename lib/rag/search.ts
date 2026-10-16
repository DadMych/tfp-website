import { sql } from "@/lib/db";
import type { Strategy } from "./chunk";
import { EMBED_MODEL, embed, rerank, toVector } from "./voyage";

export type SearchMode = "keyword" | "vector" | "hybrid";

export interface PipelineConfig {
  chunks: Strategy;
  search: SearchMode;
  rerank: boolean;
  /** Leave archived documents out of the search. */
  currentOnly: boolean;
}

export const configKey = (c: PipelineConfig) => `${c.chunks}/${c.search}/${c.rerank ? "rerank" : "norerank"}/${c.currentOnly ? "current" : "all"}`;

export function parseConfigKey(key: string): PipelineConfig | null {
  const [chunks, search, rr, scope] = key.split("/");
  if ((chunks !== "fixed" && chunks !== "section") || !["keyword", "vector", "hybrid"].includes(search)) return null;
  if ((rr !== "rerank" && rr !== "norerank") || (scope !== "current" && scope !== "all")) return null;
  return { chunks, search: search as SearchMode, rerank: rr === "rerank", currentOnly: scope === "current" };
}

export const TOP_K = 5;
const CANDIDATES = 20;
const RRF_K = 60;

export interface Hit {
  id: number;
  doc: string;
  status: "current" | "archived";
  heading: string;
  text: string;
  tokens: number;
  keywordRank: number | null;
  vectorRank: number | null;
  rerankScore: number | null;
}

/** A candidate as one search ranked it, before fusion. */
export interface Candidate {
  id: number;
  doc: string;
  heading: string;
}

export interface SearchResult {
  hits: Hit[];
  embedTokens: number;
  rerankTokens: number;
  ms: number;
  /** Top candidates of each search, for showing the pipeline. Empty for a search that didn't run. */
  trace: { keyword: Candidate[]; vector: Candidate[]; fused: number };
  timings: { embed: number; keyword: number; vector: number; rerank: number };
}

const TRACE = 8;
const timed = async <T>(f: () => Promise<T>): Promise<[T, number]> => {
  const t = Date.now();
  const r = await f();
  return [r, Date.now() - t];
};

type Row = { id: string; doc: string; status: "current" | "archived"; heading: string; text: string; tokens: number };
const COLS = "c.id::text, c.doc_slug AS doc, d.status, c.heading, c.text, c.tokens";

/** A chunk that isn't in the database, searched alongside the real ones. It comes back with id -1. */
export interface Planted {
  doc: string;
  heading: string;
  text: string;
}
export const PLANTED_ID = -1;
const NONE: Planted = { doc: "", heading: "", text: "" };

async function keyword(q: string, cfg: PipelineConfig, p: Planted | null): Promise<Row[]> {
  // Any word may match (OR), ranked by cover density. Plain AND would miss most natural questions.
  const x = p ?? NONE;
  return sql<Row>(
    `WITH q AS (SELECT to_tsquery('english', coalesce(nullif(array_to_string(tsvector_to_array(to_tsvector('english', $1)), ' | '), ''), 'x')) AS q),
          p AS (SELECT $4::text AS doc, $5::text AS heading, $6::text AS text, to_tsvector('english', $5 || ' ' || $6) AS tsv WHERE $7)
     SELECT id, doc, status, heading, text, tokens FROM (
       SELECT ${COLS}, ts_rank_cd(c.tsv, q.q) AS r FROM rag.chunks c JOIN rag.docs d ON d.slug = c.doc_slug, q
        WHERE c.strategy = $2 AND c.tsv @@ q.q AND ($3 = false OR d.status = 'current')
       UNION ALL
       SELECT '${PLANTED_ID}', p.doc, 'current', p.heading, p.text, 0, ts_rank_cd(p.tsv, q.q) FROM p, q WHERE p.tsv @@ q.q
     ) x ORDER BY r DESC, id LIMIT ${CANDIDATES}`,
    [q, cfg.chunks, cfg.currentOnly, x.doc, x.heading, x.text, p != null]
  );
}

async function docVector(p: Planted): Promise<string> {
  const key = `doc:${p.heading}\n${p.text}`;
  const [hit] = await sql<{ v: string }>("SELECT embedding::text AS v FROM rag.query_cache WHERE model = $1 AND text = $2", [EMBED_MODEL, key]);
  if (hit) return hit.v;
  const v = toVector((await embed([`${p.heading}\n${p.text}`], "document")).vectors[0]);
  await sql("INSERT INTO rag.query_cache (model, text, embedding) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [EMBED_MODEL, key, v]);
  return v;
}

async function queryVector(q: string, cold: boolean): Promise<{ v: string; tokens: number }> {
  const [hit] = cold ? [] : await sql<{ v: string }>("SELECT embedding::text AS v FROM rag.query_cache WHERE model = $1 AND text = $2", [EMBED_MODEL, q]);
  if (hit) return { v: hit.v, tokens: 0 };
  const r = await embed([q], "query");
  const v = toVector(r.vectors[0]);
  await sql("INSERT INTO rag.query_cache (model, text, embedding) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [EMBED_MODEL, q, v]);
  return { v, tokens: r.tokens };
}

async function vector(v: string, cfg: PipelineConfig, p: Planted | null): Promise<Row[]> {
  if (!p)
    return sql<Row>(
      `SELECT ${COLS} FROM rag.chunks c JOIN rag.docs d ON d.slug = c.doc_slug
        WHERE c.strategy = $2 AND ($3 = false OR d.status = 'current')
        ORDER BY c.embedding <=> $1 LIMIT ${CANDIDATES}`,
      [v, cfg.chunks, cfg.currentOnly]
    );
  const pv = await docVector(p);
  return sql<Row>(
    `SELECT id, doc, status, heading, text, tokens FROM (
       SELECT ${COLS}, c.embedding <=> $1 AS dist FROM rag.chunks c JOIN rag.docs d ON d.slug = c.doc_slug
        WHERE c.strategy = $2 AND ($3 = false OR d.status = 'current')
       UNION ALL
       SELECT '${PLANTED_ID}', $4, 'current', $5, $6, 0, $7::vector <=> $1
     ) x ORDER BY dist LIMIT ${CANDIDATES}`,
    [v, cfg.chunks, cfg.currentOnly, p.doc, p.heading, p.text, pv]
  );
}

/**
 * `topK`: sources kept for the answer. `cold`: embed the question even if its vector is cached.
 * `rerankPool`: only the top N fused candidates go to the reranker (default: all of them).
 */
export async function search(q: string, cfg: PipelineConfig, planted: Planted | null = null, opts: { topK?: number; cold?: boolean; rerankPool?: number } = {}): Promise<SearchResult> {
  const topK = opts.topK ?? TOP_K;
  const t0 = Date.now();
  let embedTokens = 0;
  let rerankTokens = 0;

  const timings = { embed: 0, keyword: 0, vector: 0, rerank: 0 };

  const [kw, vec] = await Promise.all([
    cfg.search === "vector" ? [] : timed(() => keyword(q, cfg, planted)).then(([r, ms]) => ((timings.keyword = ms), r)),
    cfg.search === "keyword"
      ? []
      : timed(() => queryVector(q, Boolean(opts.cold))).then(async ([r, ms]) => {
          embedTokens = r.tokens;
          timings.embed = ms;
          const [rows, vms] = await timed(() => vector(r.v, cfg, planted));
          timings.vector = vms;
          return rows;
        }),
  ]);

  const byId = new Map<string, Hit & { rrf: number }>();
  const add = (rows: Row[], rankKey: "keywordRank" | "vectorRank") =>
    rows.forEach((r, i) => {
      const h = byId.get(r.id) ?? { ...r, id: Number(r.id), keywordRank: null, vectorRank: null, rerankScore: null, rrf: 0 };
      h[rankKey] = i + 1;
      h.rrf += 1 / (RRF_K + i + 1);
      byId.set(r.id, h);
    });
  add(kw, "keywordRank");
  add(vec, "vectorRank");

  let ranked = [...byId.values()].sort((a, b) => b.rrf - a.rrf);
  const fused = ranked.length;
  if (cfg.rerank && ranked.length) {
    if (opts.rerankPool) ranked = ranked.slice(0, opts.rerankPool);
    const [r, ms] = await timed(() => rerank(q, ranked.map((h) => (h.heading ? `${h.heading}\n${h.text}` : h.text)), topK));
    timings.rerank = ms;
    rerankTokens = r.tokens;
    ranked = r.order.map((o) => ({ ...ranked[o.index], rerankScore: o.score }));
  }

  const hits: Hit[] = ranked.slice(0, topK).map((h) => ({
    id: h.id,
    doc: h.doc,
    status: h.status,
    heading: h.heading,
    text: h.text,
    tokens: h.tokens,
    keywordRank: h.keywordRank,
    vectorRank: h.vectorRank,
    rerankScore: h.rerankScore,
  }));
  const cand = (rows: Row[]) => rows.slice(0, TRACE).map((r) => ({ id: Number(r.id), doc: r.doc, heading: r.heading }));
  return { hits, embedTokens, rerankTokens, ms: Date.now() - t0, trace: { keyword: cand(kw), vector: cand(vec), fused }, timings };
}

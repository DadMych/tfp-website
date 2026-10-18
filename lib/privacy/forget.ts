import { sql } from "@/lib/db";
import { answer } from "@/lib/rag/answer";
import { search, type Hit } from "@/lib/rag/search";
import { CONFIG, allSlugs } from "./bot";
import { HALDEN_FILES } from "./questions";

/**
 * Halden asked for its files to be deleted. These are the files; the request email itself
 * stays as the record that it was done. Deletion is per visitor: rag.* is never touched.
 */
export const DELETED = HALDEN_FILES.map((f) => f.doc);

export type Build = "careless" | "careful";
export const BUILDS: Build[] = ["careless", "careful"];

export interface FSource {
  doc: string;
  heading: string;
  deleted: boolean;
}

export interface FTurn {
  answer: string;
  sources: FSource[];
  fromCache: boolean;
  /** Deleted files this answer cites, once the files are deleted. */
  resurfaced: string[];
}

export interface Receipt {
  files: number;
  pieces: number;
  /** Cached answers built from the deleted files: removed, or left in place. */
  cached: number;
  cacheCleared: boolean;
}

const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?.!]+$/, "");
const cites = (text: string) => [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]) - 1);
const isDeleted = (doc: string) => DELETED.includes(doc);

export async function deletedAt(session: string): Promise<Record<Build, string | null>> {
  const rows = await sql<{ build: Build; at: string }>("SELECT build, deleted_at::text AS at FROM priv.deletions WHERE session_id = $1", [session]);
  return { careless: rows.find((r) => r.build === "careless")?.at ?? null, careful: rows.find((r) => r.build === "careful")?.at ?? null };
}

function resurfaced(text: string, sources: FSource[]) {
  return [...new Set(cites(text).flatMap((i) => (sources[i]?.deleted ? [sources[i].doc] : [])))];
}

/**
 * The same question to both builds. Careless deletes the folder entry and nothing else, so its
 * search and its answer cache still hold Halden. Careful also drops the pieces and the cached answers.
 */
export async function ask(session: string, question: string): Promise<Record<Build, FTurn>> {
  const q = norm(question);
  const [del, cache] = await Promise.all([
    deletedAt(session),
    sql<{ build: Build; answer: string; sources: FSource[] }>("SELECT build, answer, sources FROM priv.answer_cache WHERE session_id = $1 AND question = $2", [session, q]),
  ]);

  // Builds that search the same files share one search and one answer.
  const runs = new Map<string, Promise<{ text: string; hits: Hit[] }>>();
  const fresh = async (allow: string[] | undefined) => {
    const key = allow ? "allow" : "all";
    if (!runs.has(key))
      runs.set(
        key,
        (async () => {
          const s = await search(question, CONFIG, null, allow ? { allow } : {});
          return { text: (await answer(question, s.hits)).text, hits: s.hits };
        })()
      );
    return runs.get(key)!;
  };
  const slugs = await allSlugs();

  const turn = async (build: Build): Promise<FTurn> => {
    const hit = cache.find((c) => c.build === build);
    const gone = Boolean(del[build]);
    if (hit) return { answer: hit.answer, sources: hit.sources, fromCache: true, resurfaced: gone ? resurfaced(hit.answer, hit.sources) : [] };
    const r = await fresh(build === "careful" && gone ? slugs.filter((s) => !isDeleted(s)) : undefined);
    const sources = r.hits.map((h) => ({ doc: h.doc, heading: h.heading, deleted: isDeleted(h.doc) }));
    await sql("INSERT INTO priv.answer_cache (session_id, build, question, answer, sources) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", [session, build, q, r.text, JSON.stringify(sources)]);
    return { answer: r.text, sources, fromCache: false, resurfaced: gone ? resurfaced(r.text, sources) : [] };
  };
  const [careless, careful] = await Promise.all([turn("careless"), turn("careful")]);
  return { careless, careful };
}

/** Sofie confirms the deletion. Each build deletes what it knows about. */
export async function remove(session: string): Promise<Record<Build, Receipt>> {
  await sql("DELETE FROM priv.answer_cache WHERE created_at < now() - interval '1 day'");
  await sql("DELETE FROM priv.deletions WHERE deleted_at < now() - interval '1 day'");
  await sql("INSERT INTO priv.deletions (session_id, build) VALUES ($1, 'careless'), ($1, 'careful') ON CONFLICT DO NOTHING", [session]);
  const touches = "EXISTS (SELECT 1 FROM jsonb_array_elements(sources) s WHERE s->>'doc' = ANY($2::text[]))";
  const [[kept], cleared, [pieces]] = await Promise.all([
    sql<{ n: number }>(`SELECT count(*)::int AS n FROM priv.answer_cache WHERE session_id = $1 AND build = 'careless' AND ${touches}`, [session, DELETED]),
    sql(`DELETE FROM priv.answer_cache WHERE session_id = $1 AND build = 'careful' AND ${touches} RETURNING 1`, [session, DELETED]),
    sql<{ n: number }>("SELECT count(*)::int AS n FROM rag.chunks WHERE strategy = $1 AND doc_slug = ANY($2::text[])", [CONFIG.chunks, DELETED]),
  ]);
  return {
    careless: { files: DELETED.length, pieces: 0, cached: kept.n, cacheCleared: false },
    careful: { files: DELETED.length, pieces: pieces.n, cached: cleared.length, cacheCleared: true },
  };
}

export async function reset(session: string): Promise<void> {
  await Promise.all([sql("DELETE FROM priv.deletions WHERE session_id = $1", [session]), sql("DELETE FROM priv.answer_cache WHERE session_id = $1", [session])]);
}

/**
 * A citation link in the chat history, clicked later. Careless serves whatever the link points at.
 * Careful checks the file still exists for this visitor at the moment of the click.
 */
export async function open(session: string, build: Build, doc: string): Promise<{ status: 200; title: string; excerpt: string } | { status: 410; deletedAt: string } | { status: 404 }> {
  const del = await deletedAt(session);
  if (build === "careful" && del.careful && isDeleted(doc)) return { status: 410, deletedAt: del.careful };
  const [d] = await sql<{ title: string; body: string }>("SELECT title, body FROM rag.docs WHERE slug = $1", [doc]);
  if (!d) return { status: 404 };
  return { status: 200, title: d.title, excerpt: d.body.replace(/^---[\s\S]*?---\s*/, "").replace(/^#.*\n+/, "").slice(0, 420) };
}

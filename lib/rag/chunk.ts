// Imported by scripts/rag-ingest.mjs through Node's type stripping: no path aliases, no enums.

export type Strategy = "fixed" | "section";

export interface Doc {
  slug: string;
  title: string;
  updated: string;
  status: "current" | "archived";
  body: string;
}

export interface Chunk {
  strategy: Strategy;
  docSlug: string;
  ord: number;
  heading: string;
  text: string;
  tokens: number;
}

export const FIXED_CHARS = 400;
export const FIXED_OVERLAP = 50;

export function parseDoc(slug: string, raw: string): Doc {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${slug}: no front matter`);
  const meta = Object.fromEntries(m[1].split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  if (meta.status !== "current" && meta.status !== "archived") throw new Error(`${slug}: bad status`);
  return { slug, title: meta.title, updated: meta.updated, status: meta.status, body: m[2].trim() };
}

export const estimateTokens = (s: string) => Math.ceil(s.length / 4);

/** The usual first attempt: fixed windows of characters with a little overlap, blind to structure. */
export function fixedChunks(doc: Doc): Chunk[] {
  const text = doc.body.replace(/\s+/g, " ");
  const out: Chunk[] = [];
  for (let start = 0, ord = 0; start < text.length; start += FIXED_CHARS - FIXED_OVERLAP, ord++) {
    const piece = text.slice(start, start + FIXED_CHARS).trim();
    out.push({ strategy: "fixed", docSlug: doc.slug, ord, heading: "", text: piece, tokens: estimateTokens(piece) });
    if (start + FIXED_CHARS >= text.length) break;
  }
  return out;
}

/** One chunk per "## " section, tables kept whole, each labelled with its document and section. */
export function sectionChunks(doc: Doc): Chunk[] {
  const parts = doc.body.split(/^## /m);
  const intro = parts[0].replace(/^# .*$/m, "").trim();
  const sections = parts.slice(1).map((p) => {
    const nl = p.indexOf("\n");
    return { h: p.slice(0, nl).trim(), body: p.slice(nl + 1).trim() };
  });
  if (intro) sections.unshift({ h: "Overview", body: intro });
  const label = doc.status === "archived" ? `${doc.title} [ARCHIVED, updated ${doc.updated}]` : `${doc.title} [updated ${doc.updated}]`;
  return sections.map((s, ord) => {
    const heading = `${label} › ${s.h}`;
    return { strategy: "section", docSlug: doc.slug, ord, heading, text: s.body, tokens: estimateTokens(heading + s.body) };
  });
}

export const chunkDoc = (doc: Doc): Chunk[] => [...fixedChunks(doc), ...sectionChunks(doc)];

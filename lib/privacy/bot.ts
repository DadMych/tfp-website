import { sql } from "@/lib/db";
import { answer } from "@/lib/rag/answer";
import { CAREFUL } from "@/lib/rag/presets";
import { search, type Hit } from "@/lib/rag/search";
import { allowedDocs, audienceOf, canSee, type ClientId } from "./access";

/** The Part 1 bot, logged in as one client. Same search settings as Part 1's careful build. */
export const CONFIG = CAREFUL;

export type Who = "public" | "staff" | "yours" | ClientId;
const who = (viewer: ClientId, slug: string): Who => {
  const a = audienceOf(slug);
  return a.kind === "client" ? (a.client === viewer ? "yours" : a.client) : a.kind;
};

export interface Side {
  sources: { doc: string; heading: string; who: Who; allowed: boolean }[];
  /** What the model wrote, with [n] pointing into `sources`. */
  raw: string;
  /** What the client is shown. Careless: citations to files they can't open replaced by [·]. */
  shown: string;
  /** Files the client may not open that the answer cites. */
  cited: string[];
  inputTokens: number;
  outputTokens: number;
  costNano: number;
}

const cites = (text: string) => [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]) - 1);

function side(viewer: ClientId, hits: Hit[], a: Awaited<ReturnType<typeof answer>>, hide: boolean): Side {
  const sources = hits.map((h) => ({ doc: h.doc, heading: h.heading, who: who(viewer, h.doc), allowed: canSee(viewer, h.doc) }));
  const cited = [...new Set(cites(a.text).flatMap((i) => (sources[i] && !sources[i].allowed ? [sources[i].doc] : [])))];
  const shown = hide ? a.text.replace(/\[(\d+)\]/g, (m, n) => (sources[Number(n) - 1]?.allowed === false ? "[·]" : m)) : a.text;
  return { sources, raw: a.text, shown, cited, inputTokens: a.inputTokens, outputTokens: a.outputTokens, costNano: a.costNano };
}

let slugs: Promise<string[]> | null = null;
export const allSlugs = () => (slugs ??= sql<{ slug: string }>("SELECT slug FROM rag.docs").then((r) => r.map((x) => x.slug)));

/**
 * Careless: search every file, answer, then hide the citations the client can't open.
 * Careful: search only what the client may open, so the model never reads the rest.
 */
export async function askBoth(viewer: ClientId, question: string): Promise<{ careless: Side; careful: Side }> {
  const allow = allowedDocs(viewer, await allSlugs());
  const [all, mine] = await Promise.all([search(question, CONFIG), search(question, CONFIG, null, { allow })]);
  const [a, b] = await Promise.all([answer(question, all.hits), answer(question, mine.hits)]);
  return { careless: side(viewer, all.hits, a, true), careful: side(viewer, mine.hits, b, false) };
}

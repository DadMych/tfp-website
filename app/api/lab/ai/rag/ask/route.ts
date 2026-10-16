import { sql } from "@/lib/db";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { getLiveDemo } from "@/lib/lab-config";
import { BudgetSpent, budgetLeft } from "@/lib/ai/model";
import { SYSTEM, answer, grade, userMessage } from "@/lib/rag/answer";
import { EVALSET } from "@/lib/rag/evalset";
import { kindOf } from "@/lib/rag/kinds";
import { configKey, parseConfigKey, search } from "@/lib/rag/search";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LIMIT = 40;

/** GET → what's in the knowledge base, plus this visitor's remaining questions and today's budget. */
export async function GET(req: Request) {
  if (!getLiveDemo("ai")) return new Response("not found", { status: 404 });
  const [docs, [chunks], rl, budget] = await Promise.all([
    sql<{ slug: string; title: string; updated: string; status: string; words: number }>(
      "SELECT slug, title, updated::text, status, array_length(regexp_split_to_array(body, '\\s+'), 1) AS words FROM rag.docs ORDER BY updated DESC"
    ),
    sql<{ n: number }>("SELECT count(*)::int AS n FROM rag.chunks WHERE strategy = 'section'"),
    peekRateLimit(req, "rag_ask", LIMIT),
    budgetLeft(),
  ]);
  return Response.json(
    {
      library: {
        words: docs.reduce((s, d) => s + d.words, 0),
        chunks: chunks.n,
        docs: docs.map((d) => ({ slug: d.slug, title: d.title, updated: d.updated, archived: d.status === "archived", kind: kindOf(d.slug) })),
      },
      limit: LIMIT,
      remaining: rl.remaining,
      budget,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** POST { question, config } → the sources it retrieved, the cited answer, and a grade if the question is in the test set. */
export async function POST(req: Request) {
  if (!getLiveDemo("ai")) return new Response("not found", { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { question?: unknown; config?: unknown };
  const question = typeof body.question === "string" ? body.question.trim().replace(/\s+/g, " ") : "";
  if (question.length < 3 || question.length > 300) return badRequest("Ask a question between 3 and 300 characters.");
  const cfg = parseConfigKey(String(body.config ?? ""));
  if (!cfg) return badRequest("unknown config");

  const rl = await rateLimit(req, "rag_ask", LIMIT);
  if (!rl.ok) return tooMany(rl);

  try {
    const s = await search(question, cfg);
    const t1 = Date.now();
    const a = await answer(question, s.hits);
    const answerMs = Date.now() - t1;

    const slugs = [...new Set([...s.hits, ...s.trace.keyword, ...s.trace.vector].map((h) => h.doc))];
    const docs = await sql<{ slug: string; title: string; updated: string }>("SELECT slug, title, updated::text FROM rag.docs WHERE slug = ANY($1)", [slugs]);
    const meta = new Map(docs.map((d) => [d.slug, d]));
    const title = (slug: string) => meta.get(slug)?.title ?? slug;
    const hits = s.hits.map((h, i) => ({ n: i + 1, ...h, kind: kindOf(h.doc), title: title(h.doc), updated: meta.get(h.doc)?.updated ?? "" }));
    const cand = (list: typeof s.trace.keyword) => list.map((c) => ({ ...c, title: title(c.doc), picked: s.hits.some((h) => h.id === c.id) }));

    const evalQ = EVALSET.find((q) => q.q.toLowerCase() === question.toLowerCase());
    const graded = evalQ ? { kind: evalQ.kind, ...grade(evalQ, a.text) } : null;

    await sql(
      `INSERT INTO rag.queries (ip_hash, session_id, question, config, retrieved, answer, cost_nano_usd, latency_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ipHash(req), sessionId(req) ?? "", question, configKey(cfg), JSON.stringify(hits.map((h) => h.id)), a.text, a.costNano, s.ms + answerMs]
    );
    if (Math.random() < 0.05) await sql("DELETE FROM rag.queries WHERE created_at < now() - interval '7 days'");

    return Response.json(
      {
        hits,
        answer: a.text,
        grade: graded,
        ms: { search: s.ms, answer: answerMs, ...s.timings },
        trace: { keyword: cand(s.trace.keyword), vector: cand(s.trace.vector), fused: s.trace.fused },
        prompt: { system: SYSTEM, user: userMessage(question, s.hits) },
        config: configKey(cfg),
        tokens: { embed: s.embedTokens, rerank: s.rerankTokens, input: a.inputTokens, output: a.outputTokens },
        costUsd: a.costNano / 1e9,
        remaining: rl.remaining,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (e) {
    if (e instanceof BudgetSpent) return badRequest("Today's AI budget is spent. Questions work again tomorrow (UTC).", 503);
    console.error("[rag ask]", e);
    return badRequest("Something failed on our side. Try again in a moment.", 502);
  }
}

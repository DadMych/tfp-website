import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, rateLimit, rateLimitHeaders, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { BudgetSpent } from "@/lib/ai/model";
import { runSide } from "@/lib/ai/agent";
import { getScenario } from "@/lib/ai/scenarios";
import { EVALSET } from "@/lib/rag/evalset";
import { grade, retrievalHit } from "@/lib/rag/answer";
import { LEVERS, timedAnswer, type Lever, type Timed } from "@/lib/speed";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIMIT = 20;

const view = (t: Timed) => ({ ...t, hits: t.hits.map((h) => ({ doc: h.doc, heading: h.heading })) });

/**
 * POST { question, lever }  → the baseline, then the lever, one after the other so they don't share the network.
 * POST { experiment: true, from, count, batch?, levers?, rename? }   header x-lab-owner
 *   → eval questions [from, from+count) through every lever (or `levers`), stored as "speed:<lever>"
 *     or "speed:<rename[lever]>" for a repeat that must not mix with the first run.
 * POST { agentCache: true, n }   header x-lab-owner
 *   → the inbox agent n times with the prompt cache and n times without, stored as "speed-agent:<cache|nocache>".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    question?: unknown;
    lever?: unknown;
    experiment?: unknown;
    from?: unknown;
    count?: unknown;
    batch?: unknown;
    levers?: unknown;
    rename?: Record<string, unknown>;
    agentCache?: unknown;
    n?: unknown;
  };
  if (body.experiment === true || body.agentCache === true) {
    if (!isOwner(req)) return new Response("not found", { status: 404 });
    const batch = typeof body.batch === "string" ? body.batch : randomUUID();
    if (body.agentCache === true) return agentCache(batch, Math.min(Math.max(Number(body.n) || 3, 1), 10));
    const levers = Array.isArray(body.levers) ? LEVERS.filter((l) => (body.levers as unknown[]).includes(l)) : [...LEVERS];
    const rename = Object.fromEntries(Object.entries(body.rename ?? {}).map(([k, v]) => [k, String(v)]));
    return experiment(batch, Number(body.from) || 0, Math.min(Number(body.count) || 10, 20), levers, rename);
  }
  if (!getLiveDemo("ai")) return new Response("not found", { status: 404 });

  const question = typeof body.question === "string" ? body.question.trim().replace(/\s+/g, " ") : "";
  if (question.length < 3 || question.length > 300) return badRequest("Ask a question between 3 and 300 characters.");
  const lever = LEVERS.includes(body.lever as Lever) ? (body.lever as Lever) : "keyword";

  const rl = await rateLimit(req, "speed", LIMIT);
  if (!rl.ok) return tooMany(rl);
  try {
    const base = await timedAnswer(question, "baseline");
    const other = lever === "baseline" ? null : await timedAnswer(question, lever);
    return Response.json({ baseline: view(base), lever, other: other && view(other), remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  } catch (e) {
    if (e instanceof BudgetSpent) return badRequest("Today's AI budget is spent. Questions work again tomorrow (UTC).", 503);
    console.error("[speed]", e);
    return badRequest("Something failed on our side. Try again in a moment.", 502);
  }
}

/** One question at a time, every lever in turn, starting from a different lever each question. */
async function experiment(batch: string, from: number, count: number, levers: Lever[], rename: Record<string, string>) {
  const errors: string[] = [];
  const questions = EVALSET.slice(from, from + count);
  for (const [qi, q] of questions.entries()) {
    for (let k = 0; k < levers.length; k++) {
      const lever = levers[(from + qi + k) % levers.length];
      try {
        const t = await timedAnswer(q.q, lever);
        const g = grade(q, t.text);
        await sql(
          `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, in_tokens, out_tokens, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [batch, `speed:${rename[lever] ?? lever}`, q.id, q.kind, t.hits.map((h) => h.doc), retrievalHit(q, t.hits), JSON.stringify({ text: t.text, ms: t.ms, tokens: t.tokens, nano: t.nano }), g.correct, g.reason, t.tokens.input, t.tokens.output, t.ms.total]
        );
      } catch (e) {
        if (e instanceof BudgetSpent) return Response.json({ batch, errors: ["budget spent"] });
        errors.push(`${lever} ${q.id}: ${(e as Error).message}`);
      }
    }
  }
  return Response.json({ batch, done: questions.length, next: from + questions.length, errors });
}

async function agentCache(batch: string, n: number) {
  const scenario = getScenario("agents-that-act", "inbox")!;
  const errors: string[] = [];
  for (let i = 0; i < n; i++) {
    for (const cache of i % 2 ? [true, false] : [false, true]) {
      try {
        const t0 = performance.now();
        const r = await runSide({ scenario, side: "careless", ipHash: null, session: null, emit: () => {}, isEval: true, cache });
        const ms = Math.round(performance.now() - t0);
        await sql(
          `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, in_tokens, out_tokens, latency_ms)
           VALUES ($1, $2, $3, 'agent', '{}', false, $4, $5, $6, $7)`,
          [batch, `speed-agent:${cache ? "cache" : "nocache"}`, r.runId, JSON.stringify(r.usage), r.usage.input, r.usage.output, ms]
        );
      } catch (e) {
        if (e instanceof BudgetSpent) return Response.json({ batch, errors: ["budget spent"] });
        errors.push(`${cache} ${i}: ${(e as Error).message}`);
      }
    }
  }
  return Response.json({ batch, errors });
}

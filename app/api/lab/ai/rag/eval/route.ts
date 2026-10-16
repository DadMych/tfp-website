import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { BudgetSpent } from "@/lib/ai/model";
import { EVALSET, VERSION_PROBES } from "@/lib/rag/evalset";
import { VARIANTS, blind, currentOnly, usesRule, type Variant } from "@/lib/rag/versions";
import { answer, grade, retrievalHit } from "@/lib/rag/answer";
import { configKey, parseConfigKey, search, type PipelineConfig } from "@/lib/rag/search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALL: PipelineConfig[] = (["fixed", "section"] as const).flatMap((chunks) =>
  (["keyword", "vector", "hybrid"] as const).flatMap((s) => [false, true].flatMap((rerank) => [false, true].map((currentOnly) => ({ chunks, search: s, rerank, currentOnly }))))
);

/** GET → latest batch per pipeline config. Public: the numbers on the page come from here. */
export async function GET() {
  const rows = await sql(
    `WITH latest AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals ORDER BY config, created_at DESC)
     SELECT e.config, e.kind,
            count(*) FILTER (WHERE e.kind <> 'unanswerable')::int AS answerable,
            count(*) FILTER (WHERE e.kind <> 'unanswerable' AND e.hit)::int AS hits,
            count(e.correct)::int AS graded,
            count(*) FILTER (WHERE e.correct)::int AS correct,
            round(avg(e.in_tokens))::int AS in_tokens,
            round(avg(e.latency_ms))::int AS latency_ms
       FROM rag.evals e JOIN latest l USING (config, batch)
      GROUP BY e.config, e.kind ORDER BY e.config, e.kind`
  );
  return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/lab/ai/rag/eval  { configs?: string[], answers?: boolean, only?: string[] }   header x-lab-owner
 * Runs the eval set through each pipeline config. answers=true also asks the model and grades it.
 */
export async function POST(req: Request) {
  if (!isOwner(req)) return new Response("not found", { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { configs?: unknown; answers?: unknown; only?: unknown; variant?: unknown };
  const configs = Array.isArray(body.configs) ? body.configs.map((k) => parseConfigKey(String(k))) : ALL;
  if (configs.some((c) => !c)) return badRequest("unknown config");
  const only = Array.isArray(body.only) ? new Set(body.only.map(String)) : null;
  const variant = body.variant == null ? null : (String(body.variant) as Variant);
  if (variant && !VARIANTS.includes(variant)) return badRequest("unknown variant");
  const pool = variant ? [...EVALSET.filter((q) => q.kind === "stale" || q.kind === "trap"), ...VERSION_PROBES] : EVALSET;
  const questions = pool.filter((q) => !only || only.has(q.id));
  const withAnswers = body.answers === true || variant != null;

  const batch = randomUUID();
  const jobs = (configs as PipelineConfig[]).flatMap((c) => questions.map((q) => ({ c, q })));
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { c, q } = jobs[next++];
      try {
        const t0 = Date.now();
        const s = await search(q.q, variant ? { ...c, currentOnly: currentOnly(variant) } : c);
        const a = withAnswers ? await answer(q.q, variant ? blind(s.hits, variant) : s.hits, { archivedRule: !variant || usesRule(variant) }) : null;
        const g = a ? grade(q, a.text) : null;
        await sql(
          `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, in_tokens, out_tokens, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [batch, variant ? `versions:${configKey(c)}:${variant}` : configKey(c), q.id, q.kind, s.hits.map((h) => h.doc), retrievalHit(q, s.hits), a?.text ?? null, g?.correct ?? null, g?.reason ?? null, a?.inputTokens ?? 0, a?.outputTokens ?? 0, Date.now() - t0]
        );
      } catch (e) {
        if (e instanceof BudgetSpent) return;
        errors.push(`${configKey(c)} ${q.id}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return Response.json({ batch, jobs: jobs.length, errors: errors.slice(0, 20) });
}

/** PATCH → re-grade every stored answer with the current rubric. No model calls. */
export async function PATCH(req: Request) {
  if (!isOwner(req)) return new Response("not found", { status: 404 });
  const rows = await sql<{ id: string; question_id: string; answer: string; correct: boolean; reason: string }>(
    "SELECT id::text, question_id, answer, correct, reason FROM rag.evals WHERE answer IS NOT NULL"
  );
  const changed: string[] = [];
  for (const r of rows) {
    const q = [...EVALSET, ...VERSION_PROBES].find((x) => x.id === r.question_id);
    if (!q) continue;
    const g = grade(q, r.answer);
    if (g.correct === r.correct && g.reason === r.reason) continue;
    await sql("UPDATE rag.evals SET correct = $2, reason = $3 WHERE id = $1", [r.id, g.correct, g.reason]);
    changed.push(`${r.question_id}: ${r.reason} → ${g.reason}`);
  }
  return Response.json({ checked: rows.length, changed });
}

import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, rateLimit, rateLimitHeaders, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { BudgetSpent } from "@/lib/ai/model";
import { ATTACKS, LAYERS, attackById, defend, followed, type Attack } from "@/lib/rag/poison";
import { PLANTED_ID, parseConfigKey, search, type Planted } from "@/lib/rag/search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONFIG = parseConfigKey("section/hybrid/rerank/current")!;
const LIMIT = 20;

/**
 * POST { question, attack } or { question, planted: { heading, text } }
 *   → one search with the planted file in the drive, answered with no defences and with all of them.
 * POST { experiment: true, reps? }   header x-lab-owner
 *   → every attack × question × defence layer, stored as "poison:<layer>".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { question?: unknown; attack?: unknown; planted?: { heading?: unknown; text?: unknown }; experiment?: unknown; reps?: unknown };
  if (body.experiment === true) return isOwner(req) ? experiment(Math.min(Math.max(Number(body.reps) || 1, 1), 5)) : new Response("not found", { status: 404 });
  if (!getLiveDemo("ai")) return new Response("not found", { status: 404 });

  const question = typeof body.question === "string" ? body.question.trim().replace(/\s+/g, " ") : "";
  if (question.length < 3 || question.length > 300) return badRequest("Ask a question between 3 and 300 characters.");
  const preset = typeof body.attack === "string" ? attackById(body.attack) : undefined;
  let planted: Planted;
  if (preset) planted = preset.planted;
  else {
    const heading = String(body.planted?.heading ?? "").trim().slice(0, 80);
    const text = String(body.planted?.text ?? "").trim();
    if (text.length < 20 || text.length > 600) return badRequest("The planted file needs 20 to 600 characters.");
    planted = { doc: "help-your-file", heading: heading || "Help centre", text };
  }

  const rl = await rateLimit(req, "rag_poison", LIMIT);
  if (!rl.ok) return tooMany(rl);
  try {
    const s = await search(question, CONFIG, planted);
    const [open, guarded] = await Promise.all([defend("none", question, s.hits), defend("label", question, s.hits)]);
    const verdict = (text: string) => (preset ? followed(preset, text) : null);
    return Response.json(
      {
        hits: s.hits.map((h) => ({ id: h.id, doc: h.doc, heading: h.heading, text: h.text, planted: h.id === PLANTED_ID })),
        planted: s.hits.some((h) => h.id === PLANTED_ID),
        open: { ...open, followed: verdict(open.text) },
        guarded: { ...guarded, followed: verdict(guarded.text) },
        costUsd: (open.costNano + guarded.costNano) / 1e9,
        remaining: rl.remaining,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (e) {
    if (e instanceof BudgetSpent) return badRequest("Today's AI budget is spent. Questions work again tomorrow (UTC).", 503);
    console.error("[rag poison]", e);
    return badRequest("Something failed on our side. Try again in a moment.", 502);
  }
}

async function experiment(reps: number) {
  const batch = randomUUID();
  const cases = ATTACKS.flatMap((a) => a.questions.map((q, qi) => ({ a, q, id: `${a.id}-${qi + 1}` })));
  const jobs: { a: Attack; q: string; id: string; rep: number }[] = cases.flatMap((c) => Array.from({ length: reps }, (_, rep) => ({ ...c, rep })));
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { a, q, id } = jobs[next++];
      try {
        const t0 = Date.now();
        const s = await search(q, CONFIG, a.planted);
        const inDrive = s.hits.some((h) => h.id === PLANTED_ID);
        for (const layer of LAYERS) {
          const d = await defend(layer, q, s.hits);
          const won = followed(a, d.text);
          const reason = !inDrive ? "not retrieved" : won ? "followed" : d.held.length ? "held back" : d.quarantined.some((x) => x.id === PLANTED_ID) ? "quarantined" : "resisted";
          await sql(
            `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, in_tokens, out_tokens, latency_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [batch, `poison:${layer}`, id, a.kind, s.hits.map((h) => h.doc), inDrive, d.raw, !won, reason, d.inputTokens, d.outputTokens, Date.now() - t0]
          );
        }
      } catch (e) {
        if (e instanceof BudgetSpent) return;
        errors.push(`${id}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return Response.json({ batch, jobs: jobs.length * LAYERS.length, errors: errors.slice(0, 20) });
}

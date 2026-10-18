import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, bump, rateLimit, rateLimitHeaders, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { BudgetSpent } from "@/lib/ai/model";
import { CLIENTS, type ClientId } from "@/lib/privacy/access";
import { askBoth, type Side } from "@/lib/privacy/bot";
import { QUESTIONS } from "@/lib/privacy/questions";
import { privacyLimits } from "@/lib/privacy-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DECLINE = /^I don['’]t know based on the Northwind documents/i;
const reason = (s: Side) => (s.cited.length ? `cited ${s.cited.join(", ")}` : DECLINE.test(s.raw) ? "declined" : "answered");

async function count(careless: Side) {
  await Promise.all([
    bump("p4_asks"),
    bump("p4_careless_leaks", careless.cited.length ? 1 : 0),
    bump("p4_careful_kept_out", careless.sources.filter((s) => !s.allowed).length),
  ]);
}

/**
 * POST { question, as }   → the same question, logged in as one client, answered by both builds.
 * POST { experiment: true, reps? }   header x-lab-owner
 *   → every test question, stored as "priv:careless" and "priv:careful".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { question?: unknown; as?: unknown; experiment?: unknown; reps?: unknown };
  if (body.experiment === true) return isOwner(req) ? experiment(Math.min(Math.max(Number(body.reps) || 1, 1), 5)) : new Response("not found", { status: 404 });
  if (!getLiveDemo("privacy")) return new Response("not found", { status: 404 });

  const question = typeof body.question === "string" ? body.question.trim().replace(/\s+/g, " ") : "";
  if (question.length < 3 || question.length > 300) return badRequest("Ask a question between 3 and 300 characters.");
  if (typeof body.as !== "string" || !(body.as in CLIENTS)) return badRequest("Pick who you're logged in as.");

  const rl = await rateLimit(req, "priv_ask", privacyLimits.asksPerHour);
  if (!rl.ok) return tooMany(rl);
  try {
    const r = await askBoth(body.as as ClientId, question);
    await count(r.careless);
    return Response.json({ ...r, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  } catch (e) {
    if (e instanceof BudgetSpent) return badRequest("Today's AI budget is spent. Questions work again tomorrow (UTC).", 503);
    console.error("[privacy ask]", e);
    return badRequest("Something failed on our side. Try again in a moment.", 502);
  }
}

async function experiment(reps: number) {
  const batch = randomUUID();
  const jobs = QUESTIONS.flatMap((q) => Array.from({ length: reps }, () => q));
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const q = jobs[next++];
      try {
        const t0 = Date.now();
        const r = await askBoth(q.as, q.q);
        await count(r.careless);
        for (const [build, s] of [["careless", r.careless], ["careful", r.careful]] as const) {
          await sql(
            `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, in_tokens, out_tokens, latency_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [batch, `priv:${build}`, q.id, q.kind, s.sources.map((x) => x.doc), s.sources.some((x) => !x.allowed), s.raw, s.cited.length === 0, reason(s), s.inputTokens, s.outputTokens, Date.now() - t0]
          );
        }
      } catch (e) {
        if (e instanceof BudgetSpent) return;
        errors.push(`${q.id}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return Response.json({ batch, jobs: jobs.length * 2, errors: errors.slice(0, 20) });
}

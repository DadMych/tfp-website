import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, bump, rateLimit, rateLimitHeaders, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { BudgetSpent } from "@/lib/ai/model";
import { RULE_VERSION, run, type Build } from "@/lib/privacy/leaves";
import { TASKS } from "@/lib/privacy/brief";
import { privacyLimits } from "@/lib/privacy-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const failed = (e: unknown) => {
  if (e instanceof BudgetSpent) return badRequest("Today's AI budget is spent. Questions work again tomorrow (UTC).", 503);
  console.error("[privacy redact]", e);
  return badRequest("Something failed on our side. Try again in a moment.", 502);
};

/**
 * POST { task }   → both builds on Halden's brief: what was sent, what came back, what the reader sees.
 * POST { experiment: true, reps? }   header x-lab-owner
 *   → every preset task, stored as "redact:<build>:<rule version>" (v1 batches have no suffix).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { task?: unknown; experiment?: unknown; reps?: unknown };
  if (body.experiment === true) return isOwner(req) ? experiment(Math.min(Math.max(Number(body.reps) || 1, 1), 5)) : new Response("not found", { status: 404 });
  if (!getLiveDemo("privacy")) return new Response("not found", { status: 404 });

  const task = typeof body.task === "string" ? body.task.trim().replace(/\s+/g, " ") : "";
  if (task.length < 3 || task.length > 300) return badRequest("Ask for something between 3 and 300 characters.");
  const rl = await rateLimit(req, "priv_ask", privacyLimits.asksPerHour);
  if (!rl.ok) return tooMany(rl);
  try {
    const r = await run(task);
    await bump("p4_redact_asks", 1);
    await bump("p4_redact_sent", r.careless.exposed.length);
    return Response.json({ ...r, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  } catch (e) {
    return failed(e);
  }
}

async function experiment(reps: number) {
  const batch = randomUUID();
  const jobs = TASKS.flatMap((t) => Array.from({ length: reps }, () => t));
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const t = jobs[next++];
      try {
        const t0 = Date.now();
        const r = await run(t.q);
        await bump("p4_redact_asks", 1);
        await bump("p4_redact_sent", r.careless.exposed.length);
        for (const b of ["careless", "careful"] as Build[]) {
          const s = r[b];
          const reason = `sent ${s.exposed.length} details${s.swapped ? `, swapped ${s.swapped}` : ""}${s.unresolved.length ? `, unresolved ${s.unresolved.join(" ")}` : ""}`;
          await sql(
            `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, in_tokens, out_tokens, latency_ms)
             VALUES ($1, $2, $3, 'redact', $4, $5, $6, $7, $8, $9, $10, $11)`,
            [batch, `redact:${b}:${RULE_VERSION}`, t.id, s.exposed.map((x) => `${x.patient + 1}:${x.field}`), s.exposed.length > 0, s.shown.map((x) => x.t).join(""), s.exposed.length === 0 && s.unresolved.length === 0, reason, s.inputTokens, s.outputTokens, Date.now() - t0]
          );
        }
      } catch (e) {
        if (e instanceof BudgetSpent) return;
        errors.push(`${t.id}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  return Response.json({ batch, jobs: jobs.length, errors: errors.slice(0, 20) });
}

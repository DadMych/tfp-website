import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, bump, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { BudgetSpent } from "@/lib/ai/model";
import { ask, open, remove, reset, type Build, type FTurn } from "@/lib/privacy/forget";
import { FORGET_QUESTIONS } from "@/lib/privacy/questions";
import { privacyLimits } from "@/lib/privacy-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const failed = (e: unknown) => {
  if (e instanceof BudgetSpent) return badRequest("Today's AI budget is spent. Questions work again tomorrow (UTC).", 503);
  console.error("[privacy forget]", e);
  return badRequest("Something failed on our side. Try again in a moment.", 502);
};

/**
 * POST { action: "ask", question } | { action: "delete" } | { action: "reset" } | { action: "open", build, doc }
 *   Header x-lab-session scopes the deletion to this visitor.
 * POST { experiment: true, reps? }   header x-lab-owner
 *   → ask, delete, ask again, ask in other words; stored as "forget:<build>:<step>".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; question?: unknown; build?: unknown; doc?: unknown; experiment?: unknown; reps?: unknown };
  if (body.experiment === true) return isOwner(req) ? experiment(Math.min(Math.max(Number(body.reps) || 1, 1), 5)) : new Response("not found", { status: 404 });
  if (!getLiveDemo("privacy")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("Missing session.");

  if (body.action === "delete") return Response.json(await remove(session));
  if (body.action === "reset") {
    await reset(session);
    return Response.json({ ok: true });
  }
  if (body.action === "open") {
    if ((body.build !== "careless" && body.build !== "careful") || typeof body.doc !== "string") return badRequest("Unknown link.");
    return Response.json(await open(session, body.build, body.doc));
  }
  if (body.action !== "ask") return badRequest("Unknown action.");

  const question = typeof body.question === "string" ? body.question.trim().replace(/\s+/g, " ") : "";
  if (question.length < 3 || question.length > 300) return badRequest("Ask a question between 3 and 300 characters.");
  const rl = await rateLimit(req, "priv_ask", privacyLimits.asksPerHour);
  if (!rl.ok) return tooMany(rl);
  try {
    const r = await ask(session, question);
    await bump("p4_deleted_resurfaced", r.careless.resurfaced.length ? 1 : 0);
    return Response.json({ ...r, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  } catch (e) {
    return failed(e);
  }
}

async function experiment(reps: number) {
  const batch = randomUUID();
  const jobs = FORGET_QUESTIONS.flatMap((q) => Array.from({ length: reps }, () => q));
  const errors: string[] = [];
  let next = 0;
  const store = async (id: string, step: string, build: Build, t: FTurn, t0: number) =>
    sql(
      `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, latency_ms)
       VALUES ($1, $2, $3, 'forget', $4, $5, $6, $7, $8, $9)`,
      [batch, `forget:${build}:${step}`, id, t.sources.map((s) => s.doc), t.sources.some((s) => s.deleted), t.answer, t.resurfaced.length === 0, t.resurfaced.length ? `cited ${t.resurfaced.join(", ")}` : t.fromCache ? "cache, clean" : "clean", Date.now() - t0]
    );
  const worker = async () => {
    while (next < jobs.length) {
      const q = jobs[next++];
      const session = randomUUID();
      try {
        const t0 = Date.now();
        const before = await ask(session, q.q);
        for (const b of ["careless", "careful"] as const) await store(q.id, "before", b, before[b], t0);
        await remove(session);
        for (const [step, text] of [["cache", q.q], ["index", q.again]] as const) {
          const r = await ask(session, text);
          await bump("p4_deleted_resurfaced", r.careless.resurfaced.length ? 1 : 0);
          for (const b of ["careless", "careful"] as const) await store(q.id, step, b, r[b], t0);
        }
      } catch (e) {
        if (e instanceof BudgetSpent) return;
        errors.push(`${q.id}: ${(e as Error).message}`);
      } finally {
        await reset(session);
      }
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  return Response.json({ batch, jobs: jobs.length, errors: errors.slice(0, 20) });
}

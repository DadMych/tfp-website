import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, bump, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { botRead, open, reset, state, tamper, trial, type Tamper } from "@/lib/privacy/audit";
import { privacyLimits } from "@/lib/privacy-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const KINDS: Tamper[] = ["delete", "edit", "delete-rehash", "edit-rehash"];

/**
 * POST { action: "state" | "open" | "bot" | "reset" } | { action: "tamper", kind: "delete" | "delete-rehash" }
 *   Header x-lab-session: the visitor's own copy of the log.
 * POST { experiment: true }   header x-lab-owner
 *   → every entry × every tamper on a fresh log, stored as "audit:careful".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; kind?: unknown; experiment?: unknown };
  if (body.experiment === true) return isOwner(req) ? experiment() : new Response("not found", { status: 404 });
  if (!getLiveDemo("privacy")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("Missing session.");

  try {
    if (body.action === "bot") {
      const rl = await rateLimit(req, "priv_ask", privacyLimits.asksPerHour);
      if (!rl.ok) return tooMany(rl);
      const r = await botRead(session);
      return Response.json({ ...r, state: await state(session), remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
    }
    const rl = await rateLimit(req, "priv_harbor", privacyLimits.opensPerHour);
    if (!rl.ok) return tooMany(rl);
    if (body.action === "open") await open(session);
    else if (body.action === "reset") await reset(session);
    else if (body.action === "tamper") {
      if (body.kind !== "delete" && body.kind !== "delete-rehash") return badRequest("Unknown change.");
      const r = await tamper(session, body.kind);
      const s = await state(session);
      await bump("p4_audit_tampers", 1);
      await bump("p4_audit_caught", s.check.ok ? 0 : 1);
      return Response.json({ ...r, state: s });
    } else if (body.action !== "state") return badRequest("Unknown action.");
    return Response.json({ state: await state(session) });
  } catch (e) {
    console.error("[privacy audit]", e);
    return badRequest("Something failed on our side. Try again in a moment.", 502);
  }
}

async function experiment() {
  const batch = randomUUID();
  const jobs = KINDS.flatMap((kind) => Array.from({ length: 10 }, (_, i) => ({ kind, seq: i + 1 })));
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { kind, seq } = jobs[next++];
      try {
        const t0 = Date.now();
        const r = await trial(randomUUID(), seq, kind);
        const refused = r.app !== "deleted";
        await sql(
          `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, latency_ms)
           VALUES ($1, 'audit:careful', $2, 'audit', $3, $4, $5, $6, $7, $8)`,
          [batch, `${kind}:${seq}`, [r.target], refused, r.app, !r.check.ok, r.check.ok ? "not caught" : `caught at entry ${r.check.seq}: ${r.check.why}`, Date.now() - t0]
        );
      } catch (e) {
        errors.push(`${kind}:${seq}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return Response.json({ batch, jobs: jobs.length, errors: errors.slice(0, 20) });
}

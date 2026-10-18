import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, bump, rateLimit, sessionId, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { attempt, forge, openCareful, openCareless, reset, share } from "@/lib/privacy/links";
import { STEPS, type Links, type Step } from "@/lib/privacy/link-steps";
import { privacyLimits } from "@/lib/privacy-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FORGERIES = 1000;
const isLinks = (l: unknown): l is Links => !!l && typeof (l as Links).careless === "string" && typeof (l as Links).careful === "string" && (l as Links).careful.length < 600 && (l as Links).careless.length < 600;

/**
 * POST { action: "share" | "reset" }
 * POST { action: "step", step, links }        one scripted step on both links
 * POST { action: "open", links }              the links as typed, opened by the freelancer
 *   Header x-lab-session: the visitor's own share.
 * POST { experiment: true }   header x-lab-owner
 *   → every step on a fresh share, plus forged links, stored as "links:<build>".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; step?: unknown; links?: unknown; experiment?: unknown };
  if (body.experiment === true) return isOwner(req) ? experiment() : new Response("not found", { status: 404 });
  if (!getLiveDemo("privacy")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("Missing session.");
  const rl = await rateLimit(req, "priv_harbor", privacyLimits.opensPerHour);
  if (!rl.ok) return tooMany(rl);

  try {
    if (body.action === "share") return Response.json(await share(session));
    if (body.action === "reset") {
      await reset(session);
      return Response.json({ ok: true });
    }
    if (!isLinks(body.links)) return badRequest("Missing links.");
    if (body.action === "open") {
      const [careless, careful] = await Promise.all([openCareless(body.links.careless), openCareful(session, body.links.careful, "freelancer")]);
      return Response.json({ step: "open", links: body.links, careless, careful });
    }
    if (body.action !== "step" || !STEPS.some((s) => s.id === body.step)) return badRequest("Unknown step.");
    const r = await attempt(session, body.step as Step, body.links);
    await bump("p4_link_tries", 1);
    await bump("p4_link_careless_opened", r.careless.status === 200 && r.careful.status !== 200 ? 1 : 0);
    return Response.json(r);
  } catch (e) {
    console.error("[privacy links]", e);
    return badRequest("Something failed on our side. Try again in a moment.", 502);
  }
}

async function experiment() {
  const batch = randomUUID();
  const store = (build: string, id: string, opened: boolean, reason: string, answer: string) =>
    sql(
      `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason)
       VALUES ($1, $2, $3, 'links', '{}', $4, $5, $6, $7)`,
      [batch, `links:${build}`, id, opened, answer, id === "open" ? opened : !opened, reason]
    );
  for (const s of STEPS) {
    const session = randomUUID();
    try {
      const r = await attempt(session, s.id, await share(session));
      for (const b of ["careless", "careful"] as const) await store(b, s.id, r[b].status === 200, `${r[b].status}`, r[b].why);
    } finally {
      await reset(session);
    }
  }
  const session = randomUUID();
  try {
    const opened = await forge(session, await share(session), FORGERIES);
    await store("careful", "forged", opened > 0, `${opened}/${FORGERIES}`, `${opened} of ${FORGERIES} forged links opened`);
  } finally {
    await reset(session);
  }
  return Response.json({ batch });
}

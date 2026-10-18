import { badRequest, bump, rateLimit, rateLimitHeaders, tooMany, sessionId } from "@/lib/lab/request";
import { getLiveDemo } from "@/lib/lab-config";
import { auditLimits } from "@/lib/audit-lab";
import { invoiceByNumber } from "@/lib/audit/invoices";
import { openInvoice, pay, sendWebhook, reset } from "@/lib/audit/cabinet";

export const dynamic = "force-dynamic";

/** POST { action, ... } → reproduce one finding on the broken cabinet, careless vs careful. */
export async function POST(req: Request) {
  if (!getLiveDemo("audit")) return new Response("not found", { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    action?: unknown;
    invoice?: unknown;
    taps?: unknown;
    forged?: unknown;
  };
  const action = body.action;

  // Pressing LAUNCH ANYWAY and finishing the self-check: no session, no row, just a tally.
  if (action === "launch" || action === "selfcheck") {
    const rl = await rateLimit(req, "audit_show", auditLimits.showsPerHour);
    if (!rl.ok) return tooMany(rl);
    await bump(action === "launch" ? "p5_launches" : "p5_selfchecks");
    return Response.json({ ok: true, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  }

  // "invoice" is read-only (IDOR), it costs no session and no write.
  if (action === "invoice") {
    const number = typeof body.invoice === "string" ? body.invoice : "";
    const rl = await rateLimit(req, "audit_show", auditLimits.showsPerHour);
    if (!rl.ok) return tooMany(rl);
    await bump("p5_shows");
    return Response.json({ ...openInvoice(number), remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  }

  const session = sessionId(req);
  if (!session) return badRequest("Missing or malformed session id.");

  if (action === "reset") {
    await reset(session);
    return Response.json({ ok: true });
  }

  const number = typeof body.invoice === "string" ? body.invoice : "";
  if (!invoiceByNumber(number)) return badRequest("No such invoice.");

  const rl = await rateLimit(req, "audit_show", auditLimits.showsPerHour);
  if (!rl.ok) return tooMany(rl);

  if (action === "pay") {
    const taps = Math.min(5, Math.max(1, Number(body.taps) || 2));
    return Response.json({ ...(await pay(session, number, taps)), remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  }
  if (action === "webhook") {
    const forged = body.forged !== false;
    return Response.json({ ...(await sendWebhook(session, number, forged)), remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  }
  return badRequest("Unknown action.");
}

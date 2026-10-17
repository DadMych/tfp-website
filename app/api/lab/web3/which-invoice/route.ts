import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getLiveDemo } from "@/lib/lab-config";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { payerFunded } from "@/lib/web3/chain";
import { sentToday } from "@/lib/web3/confirmations";
import { newPair, payAs, whichInvoiceState } from "@/lib/web3/which-invoice";
import { web3Limits, whichInvoice, type WhichClient } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

const CLIENTS = new Set<string>(whichInvoice.clients.map((c) => c.id));

let funded: { ok: boolean; at: number } | null = null;
async function canPay() {
  if (!funded || Date.now() - funded.at > 60_000) funded = { ok: await payerFunded(BigInt(whichInvoice.units)).catch(() => false), at: Date.now() };
  return funded.ok;
}

/** GET — sync the chain and return how both setups book this visitor's pair of invoices. */
export async function GET(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const [state, rl, ok] = await Promise.all([whichInvoiceState(session), peekRateLimit(req, "w3_pay", web3Limits.paysPerHour), canPay()]);
  return NextResponse.json({ ...state, remaining: rl.remaining, funded: ok }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST { action: "pay", client } — that client pays its invoice for real on Sepolia.
 * POST { action: "new" } — a fresh pair of invoices. No transfer.
 */
export async function POST(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const { action, client } = (await req.json().catch(() => ({}))) as { action?: string; client?: string };

  if (action === "new") {
    const rl = await rateLimit(req, "w3_pair", 30);
    if (!rl.ok) return tooMany(rl);
    await newPair(session);
    return NextResponse.json({ ok: true });
  }

  if (action !== "pay") return badRequest("action must be pay | new");
  if (!client || !CLIENTS.has(client)) return badRequest("client must be a | b");

  const [pending] = await sql(
    "SELECT 1 FROM w3.deposits WHERE session_id = $1 AND invoice_id IS NOT NULL AND block_height IS NULL AND created_at > now() - interval '2 minutes'",
    [session]
  );
  if (pending) return badRequest("your last payment hasn't landed yet", 409);
  if ((await sentToday()) >= web3Limits.paysPerDay) return badRequest("the lab's wallet has sent enough for today", 429);
  if (!(await canPay())) return badRequest("the lab's wallet is out of test money", 503);

  const rl = await rateLimit(req, "w3_pay", web3Limits.paysPerHour);
  if (!rl.ok) return tooMany(rl);

  const r = await payAs(session, ipHash(req), client as WhichClient);
  if (r === "already") return badRequest("that invoice is already paid", 409);
  if (r === "failed") return badRequest("the network didn't take the payment, try again", 503);
  return NextResponse.json({ ok: true, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getLiveDemo } from "@/lib/lab-config";
import { badRequest, bump, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { pay, payerFunded } from "@/lib/web3/chain";
import { confirmationsState, sentToday, tearOut } from "@/lib/web3/confirmations";
import { invoice, web3Limits } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

const NEEDED = new Set([1, 3, 6, 12]);

let funded: { ok: boolean; at: number } | null = null;
async function canPay() {
  if (!funded || Date.now() - funded.at > 60_000) funded = { ok: await payerFunded(invoice.units).catch(() => false), at: Date.now() };
  return funded.ok;
}

/** GET — sync the chain, let both watchers look, return this visitor's view. */
export async function GET(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const [state, rl, ok] = await Promise.all([confirmationsState(session), peekRateLimit(req, "w3_pay", web3Limits.paysPerHour), canPay()]);
  return NextResponse.json({ ...state, remaining: rl.remaining, funded: ok }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST { action: "pay", needed } — one real USDC transfer on Sepolia.
 * POST { action: "tear" } — simulator: this visitor's chain loses the deposit's block.
 */
export async function POST(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const body = (await req.json().catch(() => ({}))) as { action?: string; needed?: number };

  if (body.action === "tear") {
    const r = await tearOut(session);
    if (r !== "ok") return badRequest(r, 409);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "pay") return badRequest("action must be pay | tear");
  const needed = Number(body.needed);
  if (!NEEDED.has(needed)) return badRequest("needed must be 1, 3, 6 or 12");

  const [pending] = await sql(
    "SELECT 1 FROM w3.deposits WHERE session_id = $1 AND invoice_id IS NULL AND block_height IS NULL AND created_at > now() - interval '2 minutes'",
    [session]
  );
  if (pending) return badRequest("your last payment hasn't landed yet", 409);
  if ((await sentToday()) >= web3Limits.paysPerDay) return badRequest("the lab's wallet has sent enough for today", 429);
  if (!(await canPay())) return badRequest("the lab's wallet is out of test money", 503);

  const rl = await rateLimit(req, "w3_pay", web3Limits.paysPerHour);
  if (!rl.ok) return tooMany(rl);

  const [tx] = (await pay([invoice.units]).catch(() => null)) ?? [];
  if (!tx) return badRequest("the network didn't take the payment, try again", 503);
  await sql("INSERT INTO w3.deposits (session_id, ip_hash, invoice, amount_units, tx_hash, needed) VALUES ($1, $2, $3, $4, $5, $6)", [
    session,
    ipHash(req),
    invoice.label,
    invoice.units.toString(),
    tx,
    needed,
  ]);
  await bump("w3_deposits_total");
  return NextResponse.json({ ok: true, txHash: tx, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getLiveDemo } from "@/lib/lab-config";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { FAKE_USDC, payerFunded, USDC } from "@/lib/web3/chain";
import { sentToday } from "@/lib/web3/confirmations";
import { fakeUsdcState, newInvoice, payWith } from "@/lib/web3/fake-usdc";
import { fakeUsdc, web3Limits, type FakeUsdcToken } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

let funded: { ok: boolean; at: number } | null = null;
async function canPay() {
  if (!funded || Date.now() - funded.at > 60_000) {
    const units = BigInt(fakeUsdc.units);
    const ok = FAKE_USDC != null && (await Promise.all([payerFunded(units, USDC), payerFunded(units, FAKE_USDC)]).then((r) => r.every(Boolean), () => false));
    funded = { ok, at: Date.now() };
  }
  return funded.ok;
}

/** GET — sync the chain and return how both books read this visitor's invoice. */
export async function GET(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const [state, rl, ok] = await Promise.all([fakeUsdcState(session), peekRateLimit(req, "w3_pay", web3Limits.paysPerHour), canPay()]);
  return NextResponse.json({ ...state, remaining: rl.remaining, funded: ok }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST { action: "pay", token: "real" | "fake" } — pay the invoice for real on Sepolia.
 * POST { action: "new" } — a fresh invoice. No transfer.
 */
export async function POST(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const { action, token } = (await req.json().catch(() => ({}))) as { action?: string; token?: string };

  if (action === "new") {
    const rl = await rateLimit(req, "w3_invoice", 30);
    if (!rl.ok) return tooMany(rl);
    await newInvoice(session);
    return NextResponse.json({ ok: true });
  }

  if (action !== "pay") return badRequest("action must be pay | new");
  if (token !== "real" && token !== "fake") return badRequest("token must be real | fake");
  if (FAKE_USDC == null) return badRequest("the fake token isn't deployed yet", 503);

  const [pending] = await sql(
    "SELECT 1 FROM w3.deposits WHERE session_id = $1 AND invoice_id IS NOT NULL AND block_height IS NULL AND created_at > now() - interval '2 minutes'",
    [session]
  );
  if (pending) return badRequest("your last payment hasn't landed yet", 409);
  if ((await sentToday()) >= web3Limits.paysPerDay) return badRequest("the lab's wallet has sent enough for today", 429);
  if (!(await canPay())) return badRequest("the lab's wallet is out of test money", 503);

  const rl = await rateLimit(req, "w3_pay", web3Limits.paysPerHour);
  if (!rl.ok) return tooMany(rl);

  const r = await payWith(session, ipHash(req), token as FakeUsdcToken);
  if (r === "already") return badRequest("this invoice already got that payment", 409);
  if (r === "failed") return badRequest("the network didn't take the payment, try again", 503);
  return NextResponse.json({ ok: true, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

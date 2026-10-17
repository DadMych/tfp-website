import { NextResponse } from "next/server";
import { getLiveDemo } from "@/lib/lab-config";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { payerFunded } from "@/lib/web3/chain";
import { sentToday } from "@/lib/web3/confirmations";
import { payoutState, runPayout } from "@/lib/web3/payout";
import { payout, web3Limits } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

/** One run sends three transfers: one careful, two careless. */
const PER_RUN = 3;

let funded: { ok: boolean; at: number } | null = null;
async function canPay() {
  if (!funded || Date.now() - funded.at > 60_000) funded = { ok: await payerFunded(BigInt(payout.units * PER_RUN)).catch(() => false), at: Date.now() };
  return funded.ok;
}

/** GET — sync the chain and return this visitor's latest payout run. */
export async function GET(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const [state, rl, ok] = await Promise.all([payoutState(session), peekRateLimit(req, "w3_pay", web3Limits.paysPerHour), canPay()]);
  return NextResponse.json({ ...state, remaining: rl.remaining, funded: ok }, { headers: { "Cache-Control": "no-store" } });
}

/** POST — pay the freelancer both ways, with the reply lost on purpose. */
export async function POST(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");

  const state = await payoutState(session);
  if (state.settling) return badRequest("your last payout hasn't landed yet", 409);
  if ((await sentToday()) + PER_RUN > web3Limits.paysPerDay) return badRequest("the lab's wallet has sent enough for today", 429);
  if (!(await canPay())) return badRequest("the lab's wallet is out of test money", 503);

  const rl = await rateLimit(req, "w3_pay", web3Limits.paysPerHour);
  if (!rl.ok) return tooMany(rl);

  if (!(await runPayout(session, ipHash(req)))) return badRequest("the network didn't take the payout, try again", 503);
  return NextResponse.json({ ok: true, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

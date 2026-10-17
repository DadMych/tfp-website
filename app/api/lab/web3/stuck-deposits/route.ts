import { NextResponse } from "next/server";
import { getLiveDemo } from "@/lib/lab-config";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { payerFunded } from "@/lib/web3/chain";
import { sentToday } from "@/lib/web3/confirmations";
import { payRun, stuckState } from "@/lib/web3/stuck-deposits";
import { stuck, web3Limits } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

const PER_RUN = stuck.clients.length;

let funded: { ok: boolean; at: number } | null = null;
async function canPay() {
  if (!funded || Date.now() - funded.at > 60_000) funded = { ok: await payerFunded(BigInt(stuck.units * PER_RUN)).catch(() => false), at: Date.now() };
  return funded.ok;
}

/** GET — sync, read the chain for this visitor's three invoices, and compare with the simulated provider. */
export async function GET(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const [state, rl, ok] = await Promise.all([stuckState(session), peekRateLimit(req, "w3_pay", web3Limits.paysPerHour), canPay()]);
  return NextResponse.json({ ...state, remaining: rl.remaining, funded: ok }, { headers: { "Cache-Control": "no-store" } });
}

/** POST — three clients pay three fresh invoices, for real. */
export async function POST(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");

  const state = await stuckState(session);
  if (state.settling) return badRequest("the last payments haven't settled yet", 409);
  if ((await sentToday()) + PER_RUN > web3Limits.paysPerDay) return badRequest("the lab's wallet has sent enough for today", 429);
  if (!(await canPay())) return badRequest("the lab's wallet is out of test money", 503);

  const rl = await rateLimit(req, "w3_pay", web3Limits.paysPerHour);
  if (!rl.ok) return tooMany(rl);

  if ((await payRun(session, ipHash(req))) === "failed") return badRequest("the network didn't take the payments, try again", 503);
  return NextResponse.json({ ok: true, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getLiveDemo } from "@/lib/lab-config";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { payerFunded } from "@/lib/web3/chain";
import { sentToday } from "@/lib/web3/confirmations";
import { payScenario, wrongAmountState } from "@/lib/web3/wrong-amount";
import { web3Limits, wrongAmount, type WrongAmountScenario } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

const IDS = new Set<string>(wrongAmount.scenarios.map((s) => s.id));
const MOST = BigInt(Math.max(...wrongAmount.scenarios.map((s) => s.parts.reduce((a, b) => a + b, 0))));

let funded: { ok: boolean; at: number } | null = null;
async function canPay() {
  if (!funded || Date.now() - funded.at > 60_000) funded = { ok: await payerFunded(MOST).catch(() => false), at: Date.now() };
  return funded.ok;
}

/** GET — sync the chain and return how both matchers book this visitor's latest invoice. */
export async function GET(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const [state, rl, ok] = await Promise.all([wrongAmountState(session), peekRateLimit(req, "w3_pay", web3Limits.paysPerHour), canPay()]);
  return NextResponse.json({ ...state, remaining: rl.remaining, funded: ok }, { headers: { "Cache-Control": "no-store" } });
}

/** POST { scenario } — a new invoice, paid for real on Sepolia the way the scenario says. */
export async function POST(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const { scenario } = (await req.json().catch(() => ({}))) as { scenario?: string };
  if (!scenario || !IDS.has(scenario)) return badRequest(`scenario must be ${[...IDS].join(" | ")}`);

  const [pending] = await sql(
    "SELECT 1 FROM w3.deposits WHERE session_id = $1 AND invoice_id IS NOT NULL AND block_height IS NULL AND created_at > now() - interval '2 minutes'",
    [session]
  );
  if (pending) return badRequest("your last payment hasn't landed yet", 409);
  if ((await sentToday()) >= web3Limits.paysPerDay) return badRequest("the lab's wallet has sent enough for today", 429);
  if (!(await canPay())) return badRequest("the lab's wallet is out of test money", 503);

  const rl = await rateLimit(req, "w3_pay", web3Limits.paysPerHour);
  if (!rl.ok) return tooMany(rl);

  const sent = await payScenario(session, ipHash(req), scenario as WrongAmountScenario).catch(() => 0);
  if (!sent) return badRequest("the network didn't take the payment, try again", 503);
  return NextResponse.json({ ok: true, sent, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

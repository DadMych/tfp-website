import { NextResponse } from "next/server";
import { randomBytes, randomInt } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { deliver, sign, type Delivered, type WebhookEvent } from "@/lib/lab/webhooks";
import { moneyLimits } from "@/lib/money-lab";

export const dynamic = "force-dynamic";

type Scenario = "fresh" | "replay" | "out_of_order" | "bad_signature" | "chaos";
const SCENARIOS = new Set<Scenario>(["fresh", "replay", "out_of_order", "bad_signature", "chaos"]);

const rid = (p: string) => `${p}_${randomBytes(4).toString("hex")}`;
const FORGED = "sha256=" + "0".repeat(64);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET → { limit, remaining, resetAt } for this visitor, without spending a send. */
export async function GET(req: Request) {
  const r = await peekRateLimit(req, "wh_in", moneyLimits.whDeliveriesPerHour);
  return NextResponse.json({ limit: r.limit, remaining: r.remaining, resetAt: r.resetAt }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/lab/money/webhooks/send  { scenario }
 * Plays a provider. Builds signed events and pushes them through the very
 * same deliver() the public inbox uses. Returns every delivery it made, in
 * the order they finished.
 *
 * chaos: 3 authorized + 5 captured copies + 2 forged captured, all at once,
 * each after a random 0–400 ms network delay.
 */
export async function POST(req: Request) {
  const inbox = sessionId(req);
  if (!inbox) return badRequest("missing X-Lab-Session");

  const body = (await req.json().catch(() => ({}))) as { scenario?: Scenario };
  const scenario = body.scenario;
  if (!scenario || !SCENARIOS.has(scenario)) return badRequest("scenario must be fresh | replay | out_of_order | bad_signature | chaos");

  const cost = scenario === "chaos" ? 10 : scenario === "replay" ? 6 : scenario === "fresh" || scenario === "out_of_order" ? 2 : 1;
  const rl = await rateLimit(req, "wh_in", moneyLimits.whDeliveriesPerHour);
  if (!rl.ok || rl.remaining + 1 < cost) return tooMany(rl);

  await sql("DELETE FROM wh.deliveries WHERE received_at < now() - interval '24 hours'");
  await sql("DELETE FROM wh.events WHERE processed_at < now() - interval '24 hours'");
  await sql("DELETE FROM wh.orders WHERE updated_at < now() - interval '24 hours'");

  const ip = ipHash(req);
  const now = Math.floor(Date.now() / 1000);
  const order = rid("ord");
  const authorized: WebhookEvent = { id: rid("evt"), type: "payment.authorized", order_id: order, created: now };
  const captured: WebhookEvent = { id: rid("evt"), type: "payment.captured", order_id: order, created: now + 1 };

  const t0 = Date.now();
  const push = async (ev: WebhookEvent, forged = false, delay = 0) => {
    if (delay) await sleep(delay);
    const raw = JSON.stringify(ev);
    const d: Delivered = await deliver(inbox, raw, forged ? FORGED : sign(raw), "button", ip);
    return { ...d, type: ev.type, forged, at: Date.now() - t0 };
  };

  let deliveries: Awaited<ReturnType<typeof push>>[] = [];
  switch (scenario) {
    case "fresh":
      deliveries = [await push(authorized), await push(captured)];
      break;
    case "replay":
      deliveries = [await push(authorized), ...(await Promise.all(Array.from({ length: 5 }, () => push(captured))))];
      break;
    case "out_of_order":
      deliveries = [await push(captured), await push(authorized)];
      break;
    case "bad_signature":
      deliveries = [await push(captured, true)];
      break;
    case "chaos": {
      const plan: [WebhookEvent, boolean][] = [
        ...Array.from({ length: 3 }, (): [WebhookEvent, boolean] => [authorized, false]),
        ...Array.from({ length: 5 }, (): [WebhookEvent, boolean] => [captured, false]),
        [captured, true],
        [captured, true],
      ];
      deliveries = await Promise.all(plan.map(([ev, forged]) => push(ev, forged, randomInt(0, 400))));
      break;
    }
  }
  deliveries.sort((a, b) => a.at - b.at);

  const [row] = await sql<{ state: string }>("SELECT state FROM wh.orders WHERE inbox_id = $1 AND order_id = $2", [inbox, order]);
  return NextResponse.json(
    { scenario, order_id: order, order_state: row?.state ?? null, deliveries, remaining: rl.remaining },
    { headers: rateLimitHeaders(rl) }
  );
}

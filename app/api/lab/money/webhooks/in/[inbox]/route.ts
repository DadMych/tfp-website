import { NextResponse } from "next/server";
import { badRequest, ipHash, isUuid, rateLimit, rateLimitHeaders, tooMany } from "@/lib/lab/request";
import { deliver } from "@/lib/lab/webhooks";
import { moneyLimits } from "@/lib/money-lab";

export const dynamic = "force-dynamic";

/**
 * POST /api/lab/money/webhooks/in/<inbox>
 * The public, signed endpoint. Works from curl. Body is the raw JSON event,
 * signature goes in X-Signature as "sha256=<hex hmac>".
 */
export async function POST(req: Request, ctx: { params: Promise<{ inbox: string }> }) {
  const { inbox } = await ctx.params;
  if (!isUuid(inbox)) return badRequest("inbox must be a UUID", 404);

  const rl = await rateLimit(req, "wh_in", moneyLimits.whDeliveriesPerHour);
  if (!rl.ok) return tooMany(rl);

  const raw = await req.text();
  if (raw.length > 4096) return badRequest("body too large", 413);

  const source = req.headers.get("x-lab-source") === "button" ? "button" : "http";
  const out = await deliver(inbox.toLowerCase(), raw, req.headers.get("x-signature"), source, ipHash(req));
  return NextResponse.json(out, { status: out.status, headers: rateLimitHeaders(rl) });
}

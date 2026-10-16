import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { badRequest, sessionId } from "@/lib/lab/request";

export const dynamic = "force-dynamic";

/** GET — this inbox's deliveries, orders and totals. Polled by the page. */
export async function GET(req: Request) {
  const inbox = sessionId(req);
  if (!inbox) return badRequest("missing X-Lab-Session");

  const [deliveries, orders, totals] = await Promise.all([
    sql(
      `SELECT id, event_id, event_type, source, result, latency_ms, received_at
         FROM wh.deliveries WHERE inbox_id = $1 ORDER BY id DESC LIMIT 40`,
      [inbox]
    ),
    sql(`SELECT order_id, state, last_event_at, updated_at FROM wh.orders WHERE inbox_id = $1 ORDER BY updated_at DESC LIMIT 20`, [inbox]),
    sql<{ result: string; n: string }>("SELECT result, count(*)::text AS n FROM wh.deliveries WHERE inbox_id = $1 GROUP BY result", [inbox]),
  ]);

  return NextResponse.json(
    { deliveries, orders, totals: Object.fromEntries(totals.map((t) => [t.result, Number(t.n)])) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

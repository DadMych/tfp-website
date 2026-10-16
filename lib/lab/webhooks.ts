import { createHmac, timingSafeEqual } from "node:crypto";
import { getPool, sql } from "@/lib/db";
import { bump } from "./request";

/** Published on the page on purpose. Each visitor has their own inbox. */
export const WEBHOOK_SECRET = "whsec_moneylab_demo_2026";

export const EVENT_STATES: Record<string, string> = {
  "payment.authorized": "authorized",
  "payment.captured": "captured",
  "payment.refunded": "refunded",
  "payment.failed": "failed",
};

export type DeliveryResult = "processed" | "duplicate" | "stale" | "bad_signature" | "bad_payload";

export interface WebhookEvent {
  id: string;
  type: string;
  order_id: string;
  /** Provider timestamp, unix seconds. The only ordering we trust. */
  created: number;
}

export function sign(rawBody: string): string {
  return "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
}

export function verify(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const expected = Buffer.from(sign(rawBody));
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function parse(rawBody: string): WebhookEvent | null {
  try {
    const v = JSON.parse(rawBody) as Partial<WebhookEvent>;
    if (
      typeof v.id !== "string" || v.id.length === 0 || v.id.length > 64 ||
      typeof v.type !== "string" || !(v.type in EVENT_STATES) ||
      typeof v.order_id !== "string" || v.order_id.length === 0 || v.order_id.length > 64 ||
      typeof v.created !== "number" || !Number.isFinite(v.created)
    ) {
      return null;
    }
    return { id: v.id, type: v.type, order_id: v.order_id, created: v.created };
  } catch {
    return null;
  }
}

export interface Delivered {
  result: DeliveryResult;
  status: number;
  event_id: string | null;
  order?: { order_id: string; state: string };
  ms: number;
}

/**
 * The handler. Used by the public inbox route and by the page buttons, so
 * both paths run exactly the same code.
 *
 * 1. Verify the signature over the raw body.
 * 2. INSERT the event id; a conflict means we already processed it.
 * 3. Move the order forward only if this event is newer than the last one
 *    applied. Older events are recorded but change nothing.
 * Steps 2 and 3 share one transaction: dedupe and effect commit together.
 */
export async function deliver(inboxId: string, rawBody: string, signature: string | null, source: "button" | "http", ipHash: string): Promise<Delivered> {
  const t0 = Date.now();

  async function log(result: DeliveryResult, ev: WebhookEvent | null) {
    await sql(
      "INSERT INTO wh.deliveries (inbox_id, ip_hash, event_id, event_type, source, result, latency_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [inboxId, ipHash, ev?.id ?? null, ev?.type ?? null, source, result, Date.now() - t0]
    );
    await bump("wh_deliveries_total");
    if (result === "duplicate") await bump("wh_duplicates_blocked");
  }

  if (!verify(rawBody, signature)) {
    await log("bad_signature", null);
    return { result: "bad_signature", status: 401, event_id: null, ms: Date.now() - t0 };
  }
  const ev = parse(rawBody);
  if (!ev) {
    await log("bad_payload", null);
    return { result: "bad_payload", status: 400, event_id: null, ms: Date.now() - t0 };
  }

  const client = await getPool().connect();
  let result: DeliveryResult;
  let state: string | undefined;
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO wh.events (inbox_id, event_id, event_type, order_id, created_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5))
       ON CONFLICT DO NOTHING RETURNING event_id`,
      [inboxId, ev.id, ev.type, ev.order_id, ev.created]
    );
    if (ins.rowCount === 0) {
      await client.query("ROLLBACK");
      result = "duplicate";
    } else {
      const upd = await client.query<{ state: string }>(
        `INSERT INTO wh.orders (inbox_id, order_id, state, last_event_at)
         VALUES ($1, $2, $3, to_timestamp($4))
         ON CONFLICT (inbox_id, order_id) DO UPDATE
           SET state = EXCLUDED.state, last_event_at = EXCLUDED.last_event_at, updated_at = now()
         WHERE wh.orders.last_event_at < EXCLUDED.last_event_at
         RETURNING state`,
        [inboxId, ev.order_id, EVENT_STATES[ev.type], ev.created]
      );
      await client.query("COMMIT");
      result = upd.rowCount === 1 ? "processed" : "stale";
      state = upd.rows[0]?.state;
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }

  if (!state) {
    const cur = await sql<{ state: string }>("SELECT state FROM wh.orders WHERE inbox_id = $1 AND order_id = $2", [inboxId, ev.order_id]);
    state = cur[0]?.state;
  }
  await log(result, ev);
  return { result, status: 200, event_id: ev.id, order: state ? { order_id: ev.order_id, state } : undefined, ms: Date.now() - t0 };
}

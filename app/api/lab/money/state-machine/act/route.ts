import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { getPool, sql } from "@/lib/db";
import { badRequest, bump, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { moneyLimits } from "@/lib/money-lab";

export const dynamic = "force-dynamic";

const AMOUNT_CENTS = 4900;
const CHAOS_CLICKS = 6;

type Impl = "naive" | "guarded";
type Action = "authorize" | "capture" | "void" | "refund";
type Body = { action?: Action | "reset" | "refund_twice" | "chaos" };

/** The transition table. Anything not in here does not happen on the guarded side. */
const TRANSITIONS: Record<Action, { from: string[]; to: string }> = {
  authorize: { from: ["created"], to: "authorized" },
  capture: { from: ["authorized"], to: "captured" },
  void: { from: ["authorized"], to: "voided" },
  refund: { from: ["captured"], to: "refunded" },
};
const ACTIONS = Object.keys(TRANSITIONS) as Action[];

/**
 * reason starts with a code the page reads: "illegal:", "stale:" or "check:".
 * On the naive side the write still happened; the code says what the
 * guarded side would have refused it for.
 */
interface Outcome {
  action: Action;
  ok: boolean;
  from: string;
  to: string | null;
  reason: string | null;
}

/** GET → { limit, remaining, resetAt } for this visitor, without spending a click. */
export async function GET(req: Request) {
  const r = await peekRateLimit(req, "sm_act", moneyLimits.smActionsPerHour);
  return NextResponse.json({ limit: r.limit, remaining: r.remaining, resetAt: r.resetAt }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/lab/money/state-machine/act  { action }
 * Every action hits both payments at once, so the two sides always get the
 * same clicks. Naive: a status column you can set to anything. Guarded:
 * transition table, optimistic version, CHECK on refunded_cents.
 * "refund_twice" fires two refunds in parallel, which is how the real bug
 * happened. "chaos" fires six random actions in parallel, the same six on
 * both sides.
 */
export async function POST(req: Request) {
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const body = (await req.json().catch(() => ({}))) as Body;

  const rl = await rateLimit(req, "sm_act", moneyLimits.smActionsPerHour);
  if (!rl.ok) return tooMany(rl);

  if (body.action === "reset") {
    await sql("DELETE FROM sm.payments WHERE created_at < now() - interval '24 hours'");
    await sql("DELETE FROM sm.payments WHERE session_id = $1", [session]);
    await sql(
      `INSERT INTO sm.payments (session_id, impl, amount_cents) VALUES ($1, 'naive', $2), ($1, 'guarded', $2)
       ON CONFLICT (session_id, impl) DO UPDATE SET state = 'created', refunded_cents = 0, version = 0, updated_at = now()`,
      [session, AMOUNT_CENTS]
    );
    return NextResponse.json({ ok: true, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  }

  let plan: Action[];
  if (body.action === "refund_twice") plan = ["refund", "refund"];
  else if (body.action === "chaos") plan = Array.from({ length: CHAOS_CLICKS }, () => ACTIONS[randomInt(ACTIONS.length)]);
  else if (body.action && body.action in TRANSITIONS) plan = [body.action as Action];
  else return badRequest("action must be authorize | capture | void | refund | refund_twice | chaos | reset");

  const rows = await sql<{ id: string; impl: Impl; state: string; version: number }>("SELECT id, impl, state, version FROM sm.payments WHERE session_id = $1", [session]);
  const naiveRow = rows.find((r) => r.impl === "naive");
  const guardedRow = rows.find((r) => r.impl === "guarded");
  if (!naiveRow || !guardedRow) return badRequest("no payment yet; call reset", 409);

  const pool = getPool();

  async function naive(p: typeof naiveRow & {}, action: Action): Promise<Outcome> {
    const t = TRANSITIONS[action];
    const delta = action === "refund" ? AMOUNT_CENTS : 0;
    // No WHERE on state. No version. This is a status dropdown in an admin panel.
    const { rows } = await pool.query<{ state: string; version: number }>(
      `UPDATE sm.payments SET state = $2, refunded_cents = refunded_cents + $3, version = version + 1, updated_at = now()
        WHERE id = $1 RETURNING state, version`,
      [p.id, t.to, delta]
    );
    const reason = !t.from.includes(p.state)
      ? `illegal: ${action} needs ${t.from.join(" or ")}, state was ${p.state}`
      : rows[0].version !== p.version + 1
        ? `stale: read v${p.version}, wrote over v${rows[0].version - 1}`
        : null;
    return { action, ok: true, from: p.state, to: rows[0].state, reason };
  }

  async function guarded(p: typeof guardedRow & {}, action: Action): Promise<Outcome> {
    const t = TRANSITIONS[action];
    const delta = action === "refund" ? AMOUNT_CENTS : 0;
    try {
      const { rows } = await pool.query<{ state: string }>(
        `UPDATE sm.payments SET state = $2, refunded_cents = refunded_cents + $3, version = version + 1, updated_at = now()
          WHERE id = $1 AND state = ANY($4::text[]) AND version = $5
        RETURNING state`,
        [p.id, t.to, delta, t.from, p.version]
      );
      if (rows.length === 1) return { action, ok: true, from: p.state, to: rows[0].state, reason: null };
      const [cur] = await sql<{ state: string; version: number }>("SELECT state, version FROM sm.payments WHERE id = $1", [p.id]);
      const reason = !t.from.includes(p.state)
        ? `illegal: ${action} needs ${t.from.join(" or ")}, state is ${p.state}`
        : `stale: version ${p.version} is stale, row is at ${cur.version}`;
      return { action, ok: false, from: p.state, to: null, reason };
    } catch (e) {
      const err = e as { constraint?: string };
      if (err.constraint === "guarded_refund_bounded") {
        return { action, ok: false, from: p.state, to: null, reason: "check: CHECK guarded_refund_bounded: refunded_cents would exceed amount_cents" };
      }
      throw e;
    }
  }

  const [naiveOut, guardedOut] = await Promise.all([
    Promise.all(plan.map((a) => naive(naiveRow, a))),
    Promise.all(plan.map((a) => guarded(guardedRow, a))),
  ]);

  const log = (id: string, outcomes: Outcome[]) =>
    sql(
      `INSERT INTO sm.transitions (payment_id, action, from_state, to_state, ok, reason)
       SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::boolean[], $6::text[])`,
      [id, outcomes.map((o) => o.action), outcomes.map((o) => o.from), outcomes.map((o) => o.to), outcomes.map((o) => o.ok), outcomes.map((o) => o.reason)]
    );
  await log(naiveRow.id, naiveOut);
  await log(guardedRow.id, guardedOut);
  await bump("sm_transitions_total", naiveOut.length + guardedOut.filter((o) => o.ok).length);
  await bump("sm_illegal_blocked", guardedOut.filter((o) => !o.ok).length);

  return NextResponse.json({ plan, naive: naiveOut, guarded: guardedOut, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

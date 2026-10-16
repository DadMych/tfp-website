import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { badRequest, bump, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, tooMany } from "@/lib/lab/request";
import { moneyLimits } from "@/lib/money-lab";

export const dynamic = "force-dynamic";

type Action = "reset" | "topup" | "pay" | "refund" | "chaos" | "unbalanced";
const ACTIONS = new Set<Action>(["reset", "topup", "pay", "refund", "chaos", "unbalanced"]);

const TOPUP = 10_000;
const PAY = 3_000;
const CHAOS_N = 20;
const CHAOS_AMOUNT = 500;
const CHAOS_EVERY = 4; // every 4th transfer dies between its two writes

type Leg = [account: string, delta: number];
interface Move {
  memo: string;
  amount: number;
  /** Naive side stores display numbers: cash held, wallet owed, revenue earned. */
  naive: [Leg, Leg];
  /** Ledger side: debit positive, credit negative. cash is an asset; wallet and revenue are credit accounts. */
  ledger: [Leg, Leg];
}

const move = (memo: string, amount: number, naive: [Leg, Leg], ledger: [Leg, Leg]): Move => ({ memo, amount, naive, ledger });
const MOVES = {
  topup: move("top up", TOPUP, [["wallet", +TOPUP], ["cash", +TOPUP]], [["cash", +TOPUP], ["wallet", -TOPUP]]),
  pay: move("pay for ticket", PAY, [["wallet", -PAY], ["revenue", +PAY]], [["wallet", +PAY], ["revenue", -PAY]]),
  refund: move("refund ticket", PAY, [["revenue", -PAY], ["wallet", +PAY]], [["revenue", +PAY], ["wallet", -PAY]]),
  chaos: move("chaos transfer", CHAOS_AMOUNT, [["wallet", -CHAOS_AMOUNT], ["revenue", +CHAOS_AMOUNT]], [["wallet", +CHAOS_AMOUNT], ["revenue", -CHAOS_AMOUNT]]),
};

/** GET → { limit, remaining, resetAt } for this visitor, without spending a click. */
export async function GET(req: Request) {
  const r = await peekRateLimit(req, "lg_act", moneyLimits.lgActionsPerHour);
  return NextResponse.json({ limit: r.limit, remaining: r.remaining, resetAt: r.resetAt }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/lab/money/ledger/act  { action }
 * Every action runs on both sides. Naive: two UPDATEs on a balances table,
 * no transaction. Ledger: one transaction, two entries, a deferred trigger
 * that refuses to commit anything that does not sum to zero.
 */
export async function POST(req: Request) {
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const { action } = (await req.json().catch(() => ({}))) as { action?: Action };
  if (!action || !ACTIONS.has(action)) return badRequest("action must be reset | topup | pay | refund | chaos | unbalanced");

  const rl = await rateLimit(req, "lg_act", moneyLimits.lgActionsPerHour);
  if (!rl.ok) return tooMany(rl);

  const pool = getPool();

  if (action === "reset") {
    await sql("DELETE FROM lg.journal WHERE created_at < now() - interval '24 hours'");
    await sql("DELETE FROM lg.balances WHERE session_id = $1", [session]);
    await sql("DELETE FROM lg.journal WHERE session_id = $1", [session]);
    await sql("DELETE FROM lg.ops WHERE session_id = $1", [session]);
    // Two resets racing (double click, strict-mode effect) must both end clean.
    await sql(
      `INSERT INTO lg.balances (session_id, account) VALUES ($1, 'cash'), ($1, 'wallet'), ($1, 'revenue')
       ON CONFLICT (session_id, account) DO UPDATE SET balance_cents = 0`,
      [session]
    );
    return NextResponse.json({ ok: true, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  }

  const logOp = (impl: "naive" | "ledger", memo: string, outcome: "applied" | "crashed" | "rolled_back" | "refused") =>
    sql("INSERT INTO lg.ops (session_id, impl, memo, outcome) VALUES ($1, $2, $3, $4)", [session, impl, memo, outcome]);

  const bump1 = (leg: Leg) =>
    pool.query("UPDATE lg.balances SET balance_cents = balance_cents + $3 WHERE session_id = $1 AND account = $2", [session, leg[0], leg[1]]);

  // Naive: two writes, nothing between them but hope.
  async function naive(m: Move, crash: boolean) {
    await bump1(m.naive[0]);
    if (crash) {
      await logOp("naive", `${m.memo} ${m.amount}`, "crashed");
      return "crashed" as const;
    }
    await bump1(m.naive[1]);
    await logOp("naive", `${m.memo} ${m.amount}`, "applied");
    return "applied" as const;
  }

  // Ledger: both legs or neither. The op log is written after the client is
  // released: logging from inside a held connection would starve the pool.
  async function ledger(m: Move, crash: boolean) {
    const client = await pool.connect();
    let outcome: "applied" | "rolled_back";
    try {
      await client.query("BEGIN");
      const {
        rows: [{ tx_id }],
      } = await client.query<{ tx_id: string }>("INSERT INTO lg.journal (session_id, memo) VALUES ($1, $2) RETURNING tx_id", [session, m.memo]);
      await client.query("INSERT INTO lg.entries (tx_id, session_id, account, amount_cents) VALUES ($1, $2, $3, $4)", [tx_id, session, ...m.ledger[0]]);
      if (crash) throw new Error("injected crash between legs");
      await client.query("INSERT INTO lg.entries (tx_id, session_id, account, amount_cents) VALUES ($1, $2, $3, $4)", [tx_id, session, ...m.ledger[1]]);
      await client.query("COMMIT");
      outcome = "applied";
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      outcome = "rolled_back";
    } finally {
      client.release();
    }
    await logOp("ledger", `${m.memo} ${m.amount}`, outcome);
    return outcome;
  }

  // Ledger only: one leg, then COMMIT. The deferred trigger refuses it.
  async function unbalanced() {
    const client = await pool.connect();
    let out: { outcome: "applied" | "refused"; error: string | null };
    try {
      await client.query("BEGIN");
      const {
        rows: [{ tx_id }],
      } = await client.query<{ tx_id: string }>("INSERT INTO lg.journal (session_id, memo) VALUES ($1, 'one-legged entry') RETURNING tx_id", [session]);
      await client.query("INSERT INTO lg.entries (tx_id, session_id, account, amount_cents) VALUES ($1, $2, 'cash', 99900)", [tx_id, session]);
      await client.query("COMMIT");
      out = { outcome: "applied", error: null };
    } catch (e) {
      const err = e as { constraint?: string; message?: string };
      await client.query("ROLLBACK").catch(() => undefined);
      out = { outcome: "refused", error: err.constraint ? `${err.constraint}: ${err.message}` : (err.message ?? "refused") };
    } finally {
      client.release();
    }
    await logOp("ledger", "one-legged entry 99900", out.outcome);
    return out;
  }

  let result: unknown;
  if (action === "unbalanced") {
    result = await unbalanced();
  } else if (action === "chaos") {
    const m = MOVES.chaos;
    const crashes = Array.from({ length: CHAOS_N }, (_, i) => (i + 1) % CHAOS_EVERY === 0);
    const naiveOut = await Promise.all(crashes.map((c) => naive(m, c)));
    const ledgerOut = await Promise.all(crashes.map((c) => ledger(m, c)));
    const rolledBack = ledgerOut.filter((o) => o === "rolled_back").length;
    await bump("lg_transactions_total", ledgerOut.length - rolledBack);
    await bump("lg_drift_prevented_cents", rolledBack * CHAOS_AMOUNT);
    result = {
      naive: { applied: naiveOut.filter((o) => o === "applied").length, crashed: naiveOut.filter((o) => o === "crashed").length },
      ledger: { applied: ledgerOut.length - rolledBack, rolled_back: rolledBack },
    };
  } else {
    const m = MOVES[action];
    const [n, l] = await Promise.all([naive(m, false), ledger(m, false)]);
    if (l === "applied") await bump("lg_transactions_total");
    result = { naive: n, ledger: l };
  }

  return NextResponse.json({ action, result, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

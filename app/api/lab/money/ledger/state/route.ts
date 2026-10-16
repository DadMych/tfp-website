import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { badRequest, sessionId } from "@/lib/lab/request";

export const dynamic = "force-dynamic";

/** GET — both sides' balances, the invariants, recent journal and ops. */
export async function GET(req: Request) {
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");

  const [naiveRows, ledgerRows, sumRow, journal, ops] = await Promise.all([
    sql<{ account: string; balance_cents: string }>("SELECT account, balance_cents::text FROM lg.balances WHERE session_id = $1", [session]),
    sql<{ account: string; sum: string }>("SELECT account, COALESCE(SUM(amount_cents), 0)::text AS sum FROM lg.entries WHERE session_id = $1 GROUP BY account", [session]),
    sql<{ total: string; entries: string }>("SELECT COALESCE(SUM(amount_cents), 0)::text AS total, count(*)::text AS entries FROM lg.entries WHERE session_id = $1", [session]),
    sql(
      `SELECT j.tx_id, j.memo, j.created_at,
              string_agg(e.account || ' ' || CASE WHEN e.amount_cents > 0 THEN '+' ELSE '' END || e.amount_cents::text, '  ' ORDER BY e.id) AS legs
         FROM lg.journal j JOIN lg.entries e ON e.tx_id = j.tx_id
        WHERE j.session_id = $1 GROUP BY j.tx_id ORDER BY j.created_at DESC LIMIT 15`,
      [session]
    ),
    sql("SELECT id, impl, memo, outcome, at FROM lg.ops WHERE session_id = $1 ORDER BY id DESC LIMIT 200", [session]),
  ]);

  const naive = { cash: 0, wallet: 0, revenue: 0 };
  for (const r of naiveRows) naive[r.account as keyof typeof naive] = Number(r.balance_cents);

  // Display: assets as-is, credit accounts negated.
  const sums = Object.fromEntries(ledgerRows.map((r) => [r.account, Number(r.sum)]));
  const ledger = { cash: sums.cash ?? 0, wallet: -(sums.wallet ?? 0), revenue: -(sums.revenue ?? 0) };

  return NextResponse.json(
    {
      initialized: naiveRows.length === 3,
      naive: { ...naive, drift: naive.cash - (naive.wallet + naive.revenue) },
      ledger: { ...ledger, drift: ledger.cash - (ledger.wallet + ledger.revenue), sum: Number(sumRow[0].total), entries: Number(sumRow[0].entries) },
      journal,
      ops,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

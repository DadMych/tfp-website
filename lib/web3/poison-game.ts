import { sql } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { payout, poison } from "@/lib/web3-lab";
import { freelancerAddress } from "./chain";
import { carefulPick, carelessPick, makeRound, type HistoryRow } from "./poison";

interface RoundRow {
  id: string;
  rows: HistoryRow[];
  answer: number;
  picked: number | null;
  ms: number | null;
  timed_out: boolean;
  age_ms: number;
}

export interface PoisonState {
  round: string | null;
  freelancer: string;
  rows: Omit<HistoryRow, "kind">[];
  /** Seconds left to pick. */
  left: number;
  /** Filled once the visitor has picked or run out of time. */
  result: { kinds: HistoryRow["kind"][]; answer: number; picked: number; ms: number; timedOut: boolean; careless: number; careful: number } | null;
}

async function latest(session: string): Promise<RoundRow | null> {
  const [r] = await sql<RoundRow>(
    `SELECT id, rows, answer, picked, ms, timed_out, (extract(epoch FROM now() - created_at) * 1000)::int AS age_ms
       FROM w3.poison_rounds WHERE session_id = $1 AND created_at > now() - interval '1 hour'
      ORDER BY created_at DESC LIMIT 1`,
    [session]
  );
  return r ?? null;
}

function view(r: RoundRow | null): PoisonState {
  const freelancer = freelancerAddress();
  if (!r) return { round: null, freelancer, rows: [], left: poison.seconds, result: null };
  return {
    round: r.id,
    freelancer,
    rows: r.rows.map((x) => ({ ago: x.ago, dir: x.dir, amount: x.amount, address: x.address })),
    left: Math.max(0, poison.seconds - Math.floor(r.age_ms / 1000)),
    result:
      r.picked == null
        ? null
        : {
            kinds: r.rows.map((x) => x.kind),
            answer: r.answer,
            picked: r.picked,
            ms: r.ms ?? 0,
            timedOut: r.timed_out,
            careless: carelessPick(r.rows, freelancer),
            careful: carefulPick(r.rows, [freelancer]),
          },
  };
}

export async function poisonState(session: string): Promise<PoisonState> {
  return view(await latest(session));
}

export async function newRound(session: string, ip: string): Promise<PoisonState> {
  const { rows, answer } = makeRound(freelancerAddress(), payout.units);
  await sql("INSERT INTO w3.poison_rounds (session_id, ip_hash, rows, answer) VALUES ($1, $2, $3, $4)", [session, ip, JSON.stringify(rows), answer]);
  return poisonState(session);
}

/**
 * The visitor copies one row. Time is the server's: from when the round was
 * dealt. Past the limit, the pick is the top row, which is what a hurried
 * person copies.
 */
export async function pickRow(session: string, round: string, row: number | null): Promise<PoisonState | "gone"> {
  const r = await latest(session);
  if (!r || r.id !== round || r.picked != null) return "gone";
  const timedOut = row == null || r.age_ms > (poison.seconds + 2) * 1000;
  const picked = timedOut ? 0 : row!;
  const [won] = await sql(
    "UPDATE w3.poison_rounds SET picked = $2, ms = $3, timed_out = $4 WHERE id = $1 AND picked IS NULL RETURNING 1",
    [r.id, picked, Math.min(r.age_ms, poison.seconds * 1000), timedOut]
  );
  if (!won) return "gone";
  await bump("w3_poison_rounds");
  if (picked !== r.answer) await bump("w3_poison_fooled");
  return poisonState(session);
}

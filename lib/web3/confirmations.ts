import type { Hex } from "viem";
import { sql } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { web3Limits } from "@/lib/web3-lab";
import { chain } from "./chain";
import { confirmations, sessionView, step, type Block, type Reorg, type Watched } from "./watch";

/** Blocks the page shows, newest last. */
const SHOWN = 10;
/** How far back a mismatched parent makes the sync re-read. */
const REREAD = 12;

const blockRow = (b: { number: bigint; hash: Hex; parentHash: Hex; timestamp: bigint }) => [Number(b.number), b.hash, b.parentHash, Number(b.timestamp)];

async function saveBlocks(rows: unknown[][]) {
  if (rows.length === 0) return;
  const values = rows.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, to_timestamp($${i * 4 + 4}))`).join(", ");
  await sql(
    `INSERT INTO w3.blocks (height, hash, parent_hash, ts) VALUES ${values}
     ON CONFLICT (height) DO UPDATE SET hash = EXCLUDED.hash, parent_hash = EXCLUDED.parent_hash, ts = EXCLUDED.ts, seen_at = now()`,
    rows.flat()
  );
}

/**
 * Reads new Sepolia blocks into w3.blocks. No worker: whoever polls first in a
 * 3 second window does the reading, everyone else gets what's already stored.
 * Returns the tip.
 */
export async function syncChain(): Promise<number> {
  const [claim] = await sql<{ last: string | null }>(
    `UPDATE w3.sync SET at = now() WHERE id = 1 AND at < now() - interval '3 seconds'
     RETURNING (SELECT max(height) FROM w3.blocks)::text AS last`
  );
  if (!claim) {
    const [row] = await sql<{ tip: string | null }>("SELECT tip::text FROM w3.sync WHERE id = 1");
    if (row?.tip) return Number(row.tip);
  }

  const tip = Number(await chain.getBlockNumber());
  const last = claim?.last ? Number(claim.last) : null;
  const from = Math.max(last == null ? tip - SHOWN - 2 : last + 1, tip - 19);
  const fresh = await Promise.all(
    Array.from({ length: Math.max(0, tip - from + 1) }, (_, i) => chain.getBlock({ blockNumber: BigInt(from + i) }))
  );

  // A real reorg: the first new block doesn't sit on the one we stored below it.
  if (fresh.length > 0) {
    const [below] = await sql<{ hash: string }>("SELECT hash FROM w3.blocks WHERE height = $1", [from - 1]);
    if (below && below.hash !== fresh[0].parentHash) {
      const again = await Promise.all(
        Array.from({ length: REREAD }, (_, i) => chain.getBlock({ blockNumber: BigInt(from - REREAD + i) }))
      );
      await saveBlocks(again.map(blockRow));
    }
  }
  await saveBlocks(fresh.map(blockRow));
  await sql("UPDATE w3.sync SET tip = GREATEST(COALESCE(tip, 0), $1) WHERE id = 1", [tip]);
  // A day of Sepolia, as long as a visitor's deposit stays on screen.
  await sql("DELETE FROM w3.blocks WHERE height < $1", [tip - 7_500]);

  // Where did recent payments land? Re-asked whenever the stored block no longer matches.
  const open = await sql<{ id: string; tx_hash: Hex }>(
    `SELECT d.id, d.tx_hash FROM w3.deposits d
       LEFT JOIN w3.blocks b ON b.height = d.block_height
      WHERE d.tx_hash IS NOT NULL AND d.created_at > now() - interval '1 hour'
        AND (d.block_height IS NULL OR b.hash IS DISTINCT FROM d.block_hash)
      LIMIT 20`
  );
  await Promise.all(
    open.map(async (d) => {
      const r = await chain.getTransactionReceipt({ hash: d.tx_hash }).catch(() => null);
      await sql("UPDATE w3.deposits SET block_height = $2, block_hash = $3 WHERE id = $1", [
        d.id,
        r ? Number(r.blockNumber) : null,
        r ? r.blockHash : null,
      ]);
    })
  );

  const outs = await sql<{ tx_hash: Hex }>(
    `SELECT DISTINCT p.tx_hash FROM w3.payouts p
       LEFT JOIN w3.blocks b ON b.height = p.block_height
      WHERE p.created_at > now() - interval '1 hour'
        AND (p.block_height IS NULL OR b.hash IS DISTINCT FROM p.block_hash)
      LIMIT 20`
  );
  await Promise.all(
    outs.map(async (p) => {
      const r = await chain.getTransactionReceipt({ hash: p.tx_hash }).catch(() => null);
      await sql("UPDATE w3.payouts SET block_height = $2, block_hash = $3 WHERE tx_hash = $1", [p.tx_hash, r ? Number(r.blockNumber) : null, r ? r.blockHash : null]);
    })
  );
  return tip;
}

/** Transfers the lab wallet sent in the last 24 hours, every chapter together. */
export async function sentToday(): Promise<number> {
  const [{ n }] = await sql<{ n: string }>(
    `SELECT ((SELECT count(*) FROM w3.deposits WHERE created_at > now() - interval '24 hours')
           + (SELECT count(DISTINCT tx_hash) FROM w3.payouts WHERE created_at > now() - interval '24 hours'))::text AS n`
  );
  return Number(n);
}

interface DepositRow extends Watched {
  id: string;
  created_at: string;
  invoice: string;
  amount_units: number;
  tx_hash: string | null;
  reorg_tip: number | null;
  reorg_depth: number | null;
  lost_counted: boolean;
}

const INT_COLS = ["block_height", "needed", "careless_paid_tip", "careful_paid_tip", "careful_caught_tip", "amount_units", "reorg_tip", "reorg_depth"] as const;

async function latestDeposit(session: string): Promise<DepositRow | null> {
  const [row] = await sql<Record<string, unknown>>(
    "SELECT * FROM w3.deposits WHERE session_id = $1 AND invoice_id IS NULL AND created_at > now() - interval '24 hours' ORDER BY created_at DESC LIMIT 1",
    [session]
  );
  if (!row) return null;
  for (const k of INT_COLS) if (row[k] != null) row[k] = Number(row[k]);
  return row as unknown as DepositRow;
}

async function realBlocks(from: number, to: number): Promise<Block[]> {
  const rows = await sql<{ height: string; hash: string; parent_hash: string }>(
    "SELECT height::text, hash, parent_hash FROM w3.blocks WHERE height BETWEEN $1 AND $2 ORDER BY height",
    [from, to]
  );
  return rows.map((r) => ({ height: Number(r.height), hash: r.hash, parent: r.parent_hash }));
}

export type Truth = "pending" | "in" | "gone";

export interface ConfirmationsState {
  tip: number;
  blocks: (Block & { deposit: boolean })[];
  deposit: null | {
    invoice: string;
    amountUnits: number;
    txHash: string | null;
    createdAt: string;
    truth: Truth;
    height: number | null;
    confirmations: number;
    needed: number;
    careless: { paidAt: number | null; lost: boolean };
    careful: { paidAt: number | null; caughtAt: number | null; lost: boolean };
    reorg: Reorg | null;
  };
}

/** Sync, let both watchers look once, and describe what this visitor sees. */
export async function confirmationsState(session: string): Promise<ConfirmationsState> {
  const tip = await syncChain();
  const d = await latestDeposit(session);
  const reorg: Reorg | null = d?.reorg_tip != null && d.reorg_depth != null ? { tip: d.reorg_tip, depth: d.reorg_depth } : null;
  const low = Math.min(d?.block_height ?? tip, tip - SHOWN + 1);
  const view = sessionView(await realBlocks(low - 1, tip), reorg, session);

  let deposit: ConfirmationsState["deposit"] = null;
  if (d) {
    const patch = step(d, view, tip);
    if (Object.keys(patch).length > 0) {
      // First writer wins: two polls landing together can't move a decision.
      await sql(
        `UPDATE w3.deposits SET
           careless_paid_tip  = COALESCE(careless_paid_tip, $2),
           careful_paid_tip   = COALESCE(careful_paid_tip, $3),
           careful_paid_hash  = COALESCE(careful_paid_hash, $4),
           careful_caught_tip = COALESCE(careful_caught_tip, $5)
         WHERE id = $1`,
        [d.id, patch.careless_paid_tip ?? null, patch.careful_paid_tip ?? null, patch.careful_paid_hash ?? null, patch.careful_caught_tip ?? null]
      );
      Object.assign(d, patch);
    }

    const conf = confirmations(d, view, tip);
    const truth: Truth = d.block_height == null ? "pending" : conf > 0 ? "in" : "gone";
    const carelessLost = truth === "gone" && d.careless_paid_tip != null;
    const carefulLost = truth === "gone" && d.careful_paid_tip != null && d.careful_caught_tip == null;

    if (truth === "gone" && !d.lost_counted) {
      const [won] = await sql("UPDATE w3.deposits SET lost_counted = true WHERE id = $1 AND NOT lost_counted RETURNING 1", [d.id]);
      if (won) {
        if (carelessLost) await bump("w3_careless_lost_units", d.amount_units);
        if (d.careful_paid_tip != null) await bump("w3_careful_lost_units", d.amount_units);
      }
    }

    deposit = {
      invoice: d.invoice,
      amountUnits: d.amount_units,
      txHash: d.tx_hash,
      createdAt: d.created_at,
      truth,
      height: d.block_height,
      confirmations: conf,
      needed: d.needed,
      careless: { paidAt: d.careless_paid_tip, lost: carelessLost },
      careful: { paidAt: d.careful_paid_tip, caughtAt: d.careful_caught_tip, lost: carefulLost },
      reorg,
    };
  }

  const shownHeight = deposit?.truth === "in" ? deposit.height : null;
  const blocks = [...view.values()]
    .filter((b) => b.height > tip - SHOWN)
    .sort((a, b) => a.height - b.height)
    .map((b) => ({ ...b, deposit: b.height === shownHeight }));
  return { tip, blocks, deposit };
}

/** Simulator: replace this visitor's chain from the deposit's block up. */
export async function tearOut(session: string): Promise<"ok" | "nothing" | "already" | "too_deep"> {
  const state = await confirmationsState(session);
  const d = state.deposit;
  if (!d || d.truth !== "in" || d.height == null) return "nothing";
  if (d.reorg) return "already";
  const depth = state.tip - d.height + 1;
  if (depth > web3Limits.maxTear) return "too_deep";
  await sql("UPDATE w3.deposits SET reorg_tip = $3, reorg_depth = $4 WHERE session_id = $1 AND tx_hash = $2 AND invoice_id IS NULL AND reorg_tip IS NULL", [
    session,
    d.txHash,
    state.tip,
    depth,
  ]);
  return "ok";
}

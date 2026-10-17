import { sql } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { wrongAmount, type WrongAmountScenario } from "@/lib/web3-lab";
import { pay } from "./chain";
import { syncChain } from "./confirmations";
import { carefulMatch, carelessMatch } from "./match";

const CHAPTER = "wrong-amount";

export interface WrongAmountState {
  tip: number;
  invoice: null | { label: string; scenario: WrongAmountScenario; units: number };
  deposits: { txHash: string; units: number; height: number | null; confirmations: number; settled: boolean }[];
  careless: ReturnType<typeof carelessMatch> | null;
  careful: ReturnType<typeof carefulMatch> | null;
}

/** Sync, then read this visitor's latest invoice and how each matcher books it. */
export async function wrongAmountState(session: string): Promise<WrongAmountState> {
  const tip = await syncChain();
  const [inv] = await sql<{ id: string; label: string; scenario: WrongAmountScenario; amount_units: string; counted: boolean }>(
    `SELECT id, label, scenario, amount_units::text, counted FROM w3.invoices
      WHERE session_id = $1 AND chapter = $2 AND created_at > now() - interval '24 hours'
      ORDER BY created_at DESC LIMIT 1`,
    [session, CHAPTER]
  );
  if (!inv) return { tip, invoice: null, deposits: [], careless: null, careful: null };

  const rows = await sql<{ tx_hash: string; amount_units: string; block_height: string | null; block_hash: string | null; chain_hash: string | null }>(
    `SELECT d.tx_hash, d.amount_units::text, d.block_height::text, d.block_hash, b.hash AS chain_hash
       FROM w3.deposits d LEFT JOIN w3.blocks b ON b.height = d.block_height
      WHERE d.invoice_id = $1 ORDER BY d.created_at, d.id`,
    [inv.id]
  );
  const deposits = rows.map((r) => {
    const height = r.block_height == null ? null : Number(r.block_height);
    const confirmations = height != null && r.chain_hash === r.block_hash ? tip - height + 1 : 0;
    return { txHash: r.tx_hash, units: Number(r.amount_units), height, confirmations, settled: confirmations >= wrongAmount.needed };
  });

  const units = Number(inv.amount_units);
  const careless = carelessMatch(units, deposits);
  const careful = carefulMatch(units, deposits);

  // Counted once, when every deposit of the run has settled.
  if (!inv.counted && deposits.length > 0 && deposits.every((d) => d.settled)) {
    const [won] = await sql("UPDATE w3.invoices SET counted = true WHERE id = $1 AND NOT counted RETURNING 1", [inv.id]);
    if (won) await bump("w3_careless_unmatched_units", careless.unaccounted);
  }

  return { tip, invoice: { label: inv.label, scenario: inv.scenario, units }, deposits, careless, careful };
}

/** A new invoice for this visitor, paid the way the scenario says: one or two real transfers. */
export async function payScenario(session: string, ip: string, id: WrongAmountScenario): Promise<number> {
  const s = wrongAmount.scenarios.find((x) => x.id === id)!;
  const hashes = await pay(s.parts.map((u) => BigInt(u)));
  const [{ id: invoiceId }] = await sql<{ id: string }>(
    "INSERT INTO w3.invoices (session_id, chapter, label, scenario, amount_units) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [session, CHAPTER, wrongAmount.invoice.label, id, wrongAmount.invoice.units]
  );
  for (const [i, tx] of hashes.entries()) {
    await sql("INSERT INTO w3.deposits (session_id, ip_hash, invoice, amount_units, tx_hash, needed, invoice_id) VALUES ($1, $2, $3, $4, $5, $6, $7)", [
      session,
      ip,
      wrongAmount.invoice.label,
      s.parts[i],
      tx,
      wrongAmount.needed,
      invoiceId,
    ]);
  }
  await bump("w3_wrong_amount_runs");
  await bump("w3_deposits_total", hashes.length);
  return hashes.length;
}

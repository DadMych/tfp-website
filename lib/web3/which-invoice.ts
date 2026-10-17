import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { whichInvoice, type WhichClient } from "@/lib/web3-lab";
import { invoiceAddress, pay, studioAddress } from "./chain";
import { syncChain } from "./confirmations";
import { carefulAttribute, carelessAttribute } from "./attribute";

const CHAPTER = "which-invoice";

interface InvoiceRow {
  id: string;
  client: WhichClient;
  label: string;
  address: string;
  amount_units: string;
}

export interface WhichInvoiceState {
  tip: number;
  shared: string;
  invoices: { client: WhichClient; label: string; address: string; paid: boolean; careless: WhichClient | null; careful: WhichClient | null }[];
  deposits: { client: WhichClient; units: number; to: string; txHash: string; confirmations: number; settled: boolean; careless: WhichClient | null; careful: WhichClient | null }[];
}

/** The visitor's current pair of invoices. `scenario` holds the pair id. */
async function latestPair(session: string): Promise<InvoiceRow[]> {
  return sql<InvoiceRow>(
    `SELECT id, client, label, address, amount_units::text FROM w3.invoices
      WHERE session_id = $1 AND chapter = $2 AND scenario = (
        SELECT scenario FROM w3.invoices WHERE session_id = $1 AND chapter = $2 AND created_at > now() - interval '24 hours'
         ORDER BY created_at DESC LIMIT 1)
      ORDER BY client`,
    [session, CHAPTER]
  );
}

/** Two open invoices, same amount, each with a deposit address of its own. */
export async function newPair(session: string): Promise<InvoiceRow[]> {
  const pair = randomUUID();
  for (const c of whichInvoice.clients) {
    const [{ i }] = await sql<{ i: string }>("SELECT nextval('w3.address_index_seq')::text AS i");
    await sql(
      `INSERT INTO w3.invoices (session_id, chapter, label, scenario, amount_units, client, address_index, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [session, CHAPTER, c.label, pair, whichInvoice.units, c.id, i, invoiceAddress(Number(i))]
    );
  }
  await bump("w3_which_runs");
  return latestPair(session);
}

export async function whichInvoiceState(session: string): Promise<WhichInvoiceState> {
  const tip = await syncChain();
  const invs = await latestPair(session);
  if (invs.length === 0) return { tip, shared: studioAddress(), invoices: [], deposits: [] };

  const rows = await sql<{ id: string; invoice_id: string; amount_units: string; to_address: string; tx_hash: string; block_height: string | null; block_hash: string | null; chain_hash: string | null; lost_counted: boolean }>(
    `SELECT d.id, d.invoice_id, d.amount_units::text, d.to_address, d.tx_hash, d.block_height::text, d.block_hash, b.hash AS chain_hash, d.lost_counted
       FROM w3.deposits d LEFT JOIN w3.blocks b ON b.height = d.block_height
      WHERE d.invoice_id = ANY($1::uuid[])
      ORDER BY d.block_height NULLS LAST, d.created_at`,
    [invs.map((i) => i.id)]
  );
  const clientOf = new Map(invs.map((i) => [i.id, i.client]));
  const deps = rows.map((r) => {
    const h = r.block_height == null ? null : Number(r.block_height);
    const confirmations = h != null && r.chain_hash === r.block_hash ? tip - h + 1 : 0;
    return { ...r, units: Number(r.amount_units), to: r.to_address, confirmations, settled: confirmations >= whichInvoice.needed };
  });

  const book = invs.map((i) => ({ id: i.id, units: Number(i.amount_units), address: i.address }));
  const careless = carelessAttribute(book, deps);
  const careful = carefulAttribute(book, deps);

  // Each misattributed deposit counted once, when it settles.
  for (const [i, d] of deps.entries()) {
    if (!d.settled || d.lost_counted || careless[i] === d.invoice_id) continue;
    const [won] = await sql("UPDATE w3.deposits SET lost_counted = true WHERE id = $1 AND NOT lost_counted RETURNING 1", [d.id]);
    if (won) await bump("w3_careless_misattributed_units", d.units);
  }

  const who = (id: string | null) => (id ? (clientOf.get(id) ?? null) : null);
  return {
    tip,
    shared: studioAddress(),
    invoices: invs.map((inv) => ({
      client: inv.client,
      label: inv.label,
      address: inv.address,
      paid: deps.some((d) => d.invoice_id === inv.id),
      careless: who(deps.find((_, i) => careless[i] === inv.id)?.invoice_id ?? null),
      careful: who(deps.find((_, i) => careful[i] === inv.id)?.invoice_id ?? null),
    })),
    deposits: deps.map((d, i) => ({
      client: clientOf.get(d.invoice_id)!,
      units: d.units,
      to: d.to,
      txHash: d.tx_hash,
      confirmations: d.confirmations,
      settled: d.settled,
      careless: who(careless[i]),
      careful: who(careful[i]),
    })),
  };
}

/** `client` pays its own invoice for real: 5,800 to that invoice's own address. */
export async function payAs(session: string, ip: string, client: WhichClient): Promise<"ok" | "already" | "failed"> {
  let invs = await latestPair(session);
  if (invs.length === 0) invs = await newPair(session);
  const inv = invs.find((i) => i.client === client)!;
  const [done] = await sql("SELECT 1 FROM w3.deposits WHERE invoice_id = $1", [inv.id]);
  if (done) return "already";

  const [tx] = (await pay([BigInt(inv.amount_units)], inv.address as `0x${string}`).catch(() => null)) ?? [];
  if (!tx) return "failed";
  await sql(
    "INSERT INTO w3.deposits (session_id, ip_hash, invoice, amount_units, tx_hash, needed, invoice_id, to_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [session, ip, inv.label, inv.amount_units, tx, whichInvoice.needed, inv.id, inv.address]
  );
  await bump("w3_deposits_total");
  return "ok";
}

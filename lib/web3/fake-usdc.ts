import type { Address } from "viem";
import { sepolia } from "viem/chains";
import { sql } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { fakeUsdc, type FakeUsdcToken } from "@/lib/web3-lab";
import { chain, FAKE_USDC, invoiceAddress, pay, tokenSymbol, USDC } from "./chain";
import { syncChain } from "./confirmations";

const CHAPTER = "fake-usdc";

/** The careless check: the token says it's USDC. */
const looksLikeUsdc = (symbol: string) => symbol === "USDC";
/** The careful check: it is Circle's contract, on the chain we expect. */
const isUsdc = (token: string) => token.toLowerCase() === USDC.toLowerCase() && chain.chain!.id === sepolia.id;

interface InvoiceRow {
  id: string;
  address: string;
}

export interface FakeUsdcState {
  tip: number;
  deployed: boolean;
  invoice: { label: string; address: string } | null;
  deposits: { token: FakeUsdcToken; contract: string; symbol: string; units: number; txHash: string; confirmations: number; settled: boolean; careless: boolean; careful: boolean }[];
  /** Settled units each book counts towards the invoice. */
  booked: { careless: number; careful: number };
}

async function latestInvoice(session: string): Promise<InvoiceRow | null> {
  const [row] = await sql<InvoiceRow>(
    `SELECT id, address FROM w3.invoices
      WHERE session_id = $1 AND chapter = $2 AND created_at > now() - interval '24 hours'
      ORDER BY created_at DESC LIMIT 1`,
    [session, CHAPTER]
  );
  return row ?? null;
}

/** A fresh invoice with a deposit address of its own. */
export async function newInvoice(session: string): Promise<void> {
  const [{ i }] = await sql<{ i: string }>("SELECT nextval('w3.address_index_seq')::text AS i");
  await sql(
    `INSERT INTO w3.invoices (session_id, chapter, label, scenario, amount_units, address_index, address)
     VALUES ($1, $2, $3, 'fake-usdc', $4, $5, $6)`,
    [session, CHAPTER, fakeUsdc.label, fakeUsdc.units, i, invoiceAddress(Number(i))]
  );
}

export async function fakeUsdcState(session: string): Promise<FakeUsdcState> {
  const tip = await syncChain();
  const inv = await latestInvoice(session);
  const empty = { tip, deployed: FAKE_USDC != null, invoice: null, deposits: [], booked: { careless: 0, careful: 0 } };
  if (!inv) return empty;

  const rows = await sql<{ id: string; token: string; amount_units: string; tx_hash: string; block_height: string | null; block_hash: string | null; chain_hash: string | null; lost_counted: boolean }>(
    `SELECT d.id, d.token, d.amount_units::text, d.tx_hash, d.block_height::text, d.block_hash, b.hash AS chain_hash, d.lost_counted
       FROM w3.deposits d LEFT JOIN w3.blocks b ON b.height = d.block_height
      WHERE d.invoice_id = $1
      ORDER BY d.block_height NULLS LAST, d.created_at`,
    [inv.id]
  );

  const deposits = await Promise.all(
    rows.map(async (r) => {
      const symbol = await tokenSymbol(r.token as Address);
      const h = r.block_height == null ? null : Number(r.block_height);
      const confirmations = h != null && r.chain_hash === r.block_hash ? tip - h + 1 : 0;
      return {
        token: (isUsdc(r.token) ? "real" : "fake") as FakeUsdcToken,
        contract: r.token,
        symbol,
        units: Number(r.amount_units),
        txHash: r.tx_hash,
        confirmations,
        settled: confirmations >= fakeUsdc.needed,
        careless: looksLikeUsdc(symbol),
        careful: isUsdc(r.token),
      };
    })
  );

  // Each fake deposit the careless book accepted is counted once, when it settles.
  for (const [i, d] of deposits.entries()) {
    if (!d.settled || !d.careless || d.careful || rows[i].lost_counted) continue;
    const [won] = await sql("UPDATE w3.deposits SET lost_counted = true WHERE id = $1 AND NOT lost_counted RETURNING 1", [rows[i].id]);
    if (won) await bump("w3_careless_fake_units", d.units);
  }

  const sum = (ok: (d: (typeof deposits)[number]) => boolean) => deposits.filter((d) => d.settled && ok(d)).reduce((s, d) => s + d.units, 0);
  return {
    ...empty,
    invoice: { label: fakeUsdc.label, address: inv.address },
    deposits,
    booked: { careless: sum((d) => d.careless), careful: sum((d) => d.careful) },
  };
}

/** The client pays the invoice for real, in Circle's USDC or in the lab's fake one. One of each per invoice. */
export async function payWith(session: string, ip: string, kind: FakeUsdcToken): Promise<"ok" | "already" | "failed"> {
  const token = kind === "real" ? USDC : FAKE_USDC!;
  let inv = await latestInvoice(session);
  if (!inv) {
    await newInvoice(session);
    inv = (await latestInvoice(session))!;
  }
  const [done] = await sql("SELECT 1 FROM w3.deposits WHERE invoice_id = $1 AND lower(token) = lower($2)", [inv.id, token]);
  if (done) return "already";

  const [tx] = (await pay([BigInt(fakeUsdc.units)], inv.address as Address, token).catch(() => null)) ?? [];
  if (!tx) return "failed";
  await sql(
    "INSERT INTO w3.deposits (session_id, ip_hash, invoice, amount_units, tx_hash, needed, invoice_id, to_address, token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [session, ip, fakeUsdc.label, fakeUsdc.units, tx, fakeUsdc.needed, inv.id, inv.address, token]
  );
  await bump("w3_deposits_total");
  if (kind === "fake") await bump("w3_fake_runs");
  return "ok";
}

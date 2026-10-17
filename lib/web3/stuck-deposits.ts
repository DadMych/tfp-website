import { randomUUID } from "node:crypto";
import { parseAbiItem, type Address } from "viem";
import { sql } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { stuck, type StuckClient } from "@/lib/web3-lab";
import { chain, invoiceAddress, payTo, USDC } from "./chain";
import { syncChain } from "./confirmations";
import { carefulStatus, carelessStatus, webhookAt, type CarefulStatus, type CarelessStatus } from "./stuck";

const CHAPTER = "stuck-deposits";
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

interface InvoiceRow {
  id: string;
  client: StuckClient;
  label: string;
  address: string;
  from_block: string;
}

export interface StuckState {
  tip: number;
  invoices: {
    client: StuckClient;
    label: string;
    address: string;
    /** What the careful side read from the chain itself. */
    chain: { txHash: string; units: number; confirmations: number } | null;
    /** Block the simulated provider's webhook arrived at, once it has. */
    webhook: number | null;
    careless: CarelessStatus;
    careful: CarefulStatus;
  }[];
  paid: boolean;
  settling: boolean;
}

async function latestRun(session: string): Promise<InvoiceRow[]> {
  return sql<InvoiceRow>(
    `SELECT id, client, label, address, from_block::text FROM w3.invoices
      WHERE session_id = $1 AND chapter = $2 AND scenario = (
        SELECT scenario FROM w3.invoices WHERE session_id = $1 AND chapter = $2 AND created_at > now() - interval '24 hours'
         ORDER BY created_at DESC LIMIT 1)
      ORDER BY client`,
    [session, CHAPTER]
  );
}

/** Three open invoices, each with its own address. The chain read starts at the current tip. */
export async function newRun(session: string): Promise<InvoiceRow[]> {
  const run = randomUUID();
  const tip = Number(await chain.getBlockNumber());
  for (const c of stuck.clients) {
    const [{ i }] = await sql<{ i: string }>("SELECT nextval('w3.address_index_seq')::text AS i");
    await sql(
      `INSERT INTO w3.invoices (session_id, chapter, label, scenario, amount_units, client, address_index, address, from_block)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [session, CHAPTER, c.label, run, stuck.units, c.id, i, invoiceAddress(Number(i)), tip]
    );
  }
  return latestRun(session);
}

/** USDC Transfer logs to the invoices' addresses, straight from the chain. The careful side's only source. */
async function chainSightings(invs: InvoiceRow[], tip: number) {
  const from = BigInt(Math.min(...invs.map((i) => Number(i.from_block))));
  const logs = await chain.getLogs({ address: USDC, event: TRANSFER, args: { to: invs.map((i) => i.address as Address) }, fromBlock: from, toBlock: BigInt(tip) });
  const first = new Map<string, { txHash: string; units: number; height: number }>();
  for (const l of logs) {
    const to = l.args.to!.toLowerCase();
    if (!first.has(to)) first.set(to, { txHash: l.transactionHash, units: Number(l.args.value), height: Number(l.blockNumber) });
  }
  return first;
}

export async function stuckState(session: string): Promise<StuckState> {
  const tip = await syncChain();
  const invs = await latestRun(session);
  if (invs.length === 0) return { tip, invoices: [], paid: false, settling: false };

  const [seen, deps] = await Promise.all([
    chainSightings(invs, tip),
    sql<{ id: string; invoice_id: string; amount_units: string; block_height: string | null; lost_counted: boolean }>(
      "SELECT id, invoice_id, amount_units::text, block_height::text, lost_counted FROM w3.deposits WHERE invoice_id = ANY($1::uuid[])",
      [invs.map((i) => i.id)]
    ),
  ]);

  const invoices = [];
  for (const inv of invs) {
    const c = stuck.clients.find((x) => x.id === inv.client)!;
    const dep = deps.find((d) => d.invoice_id === inv.id);
    const s = seen.get(inv.address.toLowerCase()) ?? null;
    // The provider is simulated: it learns of the deposit from the same block and reports it `lag` blocks late, or never.
    const at = dep?.block_height != null ? webhookAt(Number(dep.block_height), stuck.needed, c.lag) : null;
    const input = { chainHeight: s?.height ?? null, webhook: at, tip, needed: stuck.needed, grace: stuck.grace };
    const careful = carefulStatus(input);
    const careless = carelessStatus(input);

    // A paid invoice the careless book still chases, counted once, when the provider's silence becomes a problem.
    if (dep && c.lag == null && careless === "reminder" && !dep.lost_counted) {
      const [won] = await sql("UPDATE w3.deposits SET lost_counted = true WHERE id = $1 AND NOT lost_counted RETURNING 1", [dep.id]);
      if (won) await bump("w3_careless_stuck_units", Number(dep.amount_units));
    }

    invoices.push({
      client: inv.client,
      label: inv.label,
      address: inv.address,
      chain: s ? { txHash: s.txHash, units: s.units, confirmations: tip - s.height + 1 } : null,
      webhook: at != null && tip >= at ? at : null,
      careless,
      careful,
    });
  }
  return {
    tip,
    invoices,
    paid: deps.length > 0,
    settling: deps.some((d) => d.block_height == null) || invoices.some((i) => i.careful === "confirming" || i.careful === "waiting-provider"),
  };
}

/** All three clients pay their invoice, for real: three USDC transfers, one per invoice address. */
export async function payRun(session: string, ip: string): Promise<"ok" | "failed"> {
  let invs = await latestRun(session);
  const [done] = invs.length ? await sql("SELECT 1 FROM w3.deposits WHERE invoice_id = ANY($1::uuid[])", [invs.map((i) => i.id)]) : [];
  if (invs.length === 0 || done) invs = await newRun(session);

  const hashes = (await payTo(invs.map((inv) => ({ to: inv.address as Address, units: BigInt(stuck.units) }))).catch(() => null)) ?? [];
  if (hashes.length === 0) return "failed";
  for (const [i, tx] of hashes.entries()) {
    const inv = invs[i];
    await sql(
      "INSERT INTO w3.deposits (session_id, ip_hash, invoice, amount_units, tx_hash, needed, invoice_id, to_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [session, ip, inv.label, stuck.units, tx, stuck.needed, inv.id, inv.address]
    );
  }
  await bump("w3_deposits_total", hashes.length);
  await bump("w3_stuck_runs");
  return "ok";
}

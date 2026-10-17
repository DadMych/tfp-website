import { randomUUID } from "node:crypto";
import { erc20Abi, keccak256, type Hex } from "viem";
import { sql } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { payout } from "@/lib/web3-lab";
import { chain, freelancerAddress, transferData, USDC, withPayer } from "./chain";
import { syncChain } from "./confirmations";

type Side = "careless" | "careful";

const nodeMessage = (err: unknown) => {
  const m = err instanceof Error ? err.message : String(err);
  return /already known/i.test(m) ? "already known" : /nonce too low/i.test(m) ? "nonce too low: already in" : m.split("\n")[0].slice(0, 80);
};

/**
 * One payout, both ways, for real. Each side sends, the reply is dropped on
 * purpose, and each side retries the way its code says.
 */
export async function runPayout(session: string, ip: string): Promise<boolean> {
  const runId = randomUUID();
  const to = freelancerAddress();
  const units = BigInt(payout.units);
  const log = (side: Side, attempt: number, nonce: number, recorded: string, hash: Hex, raw: Hex | null, nodeSaid: string | null) =>
    sql(
      `INSERT INTO w3.payouts (run_id, session_id, ip_hash, side, attempt, amount_units, nonce, recorded, tx_hash, raw_tx, node_said)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [runId, session, ip, side, attempt, payout.units, nonce, recorded, hash, raw, nodeSaid]
    );

  const sent = await withPayer(async (wallet, nonce, broadcast) => {
    // Careful: sign, store, then send. A retry sends the stored bytes again.
    const req = await wallet.prepareTransactionRequest({ to: USDC, data: transferData(to, units), nonce });
    const raw = await wallet.signTransaction(req);
    const hash = keccak256(raw);
    try {
      await chain.sendRawTransaction({ serializedTransaction: raw });
    } catch {
      return false;
    }
    broadcast(nonce);
    await sql("INSERT INTO w3.payout_runs (id, session_id) VALUES ($1, $2)", [runId, session]);
    await log("careful", 1, nonce, "stored the signed tx, sent it · reply lost", hash, raw, "accepted");
    const again = await chain.sendRawTransaction({ serializedTransaction: raw }).then(
      (h) => (h === hash ? "accepted: same hash" : `accepted: ${h}`),
      nodeMessage
    );
    await log("careful", 2, nonce, "retry: sent the same stored tx", hash, raw, again);

    // Careless: build and send. On a lost reply, build and send again.
    try {
      const first = await wallet.writeContract({ address: USDC, abi: erc20Abi, functionName: "transfer", args: [to, units], nonce: nonce + 1 });
      broadcast(nonce + 1);
      await log("careless", 1, nonce + 1, "sent · reply lost, marked failed", first, null, "accepted");
      const second = await wallet.writeContract({ address: USDC, abi: erc20Abi, functionName: "transfer", args: [to, units], nonce: nonce + 2 });
      broadcast(nonce + 2);
      await log("careless", 2, nonce + 2, "retry: built a new tx, sent", second, null, "accepted");
    } catch {
      /* whatever went out is logged above */
    }
    return true;
  });
  if (!sent) return false;
  await bump("w3_payout_runs");
  return true;
}
export interface PayoutState {
  tip: number;
  freelancer: string;
  attempts: { side: Side; attempt: number; nonce: number; recorded: string; nodeSaid: string | null; txHash: string; landed: boolean }[];
  received: Record<Side, number>;
  settling: boolean;
}

export async function payoutState(session: string): Promise<PayoutState> {
  const tip = await syncChain();
  const rows = await sql<{ side: Side; attempt: number; nonce: number; recorded: string; node_said: string | null; tx_hash: string; amount_units: string; landed: boolean; run_id: string; counted: boolean }>(
    `SELECT p.side, p.attempt, p.nonce, p.recorded, p.node_said, p.tx_hash, p.amount_units::text, p.run_id, r.counted,
            (p.block_height IS NOT NULL AND b.hash = p.block_hash) AS landed
       FROM w3.payouts p
       JOIN w3.payout_runs r ON r.id = p.run_id
       LEFT JOIN w3.blocks b ON b.height = p.block_height
      WHERE p.run_id = (SELECT id FROM w3.payout_runs WHERE session_id = $1 AND created_at > now() - interval '24 hours' ORDER BY created_at DESC LIMIT 1)
      ORDER BY p.side DESC, p.attempt`,
    [session]
  );

  // The freelancer is paid once per distinct transaction that landed.
  const received: Record<Side, number> = { careless: 0, careful: 0 };
  for (const side of ["careless", "careful"] as const) {
    const hashes = new Set(rows.filter((r) => r.side === side && r.landed).map((r) => r.tx_hash));
    received[side] = hashes.size * payout.units;
  }
  const settling = rows.some((r) => !r.landed);

  const run = rows[0];
  if (run && !settling && !run.counted) {
    const [won] = await sql("UPDATE w3.payout_runs SET counted = true WHERE id = $1 AND NOT counted RETURNING 1", [run.run_id]);
    if (won) await bump("w3_careless_overpaid_units", Math.max(0, received.careless - payout.units));
  }

  return {
    tip,
    freelancer: freelancerAddress(),
    attempts: rows.map((r) => ({ side: r.side, attempt: r.attempt, nonce: r.nonce, recorded: r.recorded, nodeSaid: r.node_said, txHash: r.tx_hash, landed: r.landed })),
    received,
    settling,
  };
}

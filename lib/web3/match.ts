export interface Received {
  units: number;
  /** Enough blocks on top to count. */
  settled: boolean;
}

/**
 * Careless: looks at each deposit on its own and marks the invoice paid the
 * first time one covers it. Anything else that arrived is on no invoice.
 */
export function carelessMatch(invoice: number, deposits: Received[]) {
  const settled = deposits.filter((d) => d.settled);
  const paid = settled.some((d) => d.units >= invoice);
  const received = settled.reduce((s, d) => s + d.units, 0);
  return { paid, received, recorded: paid ? invoice : 0, unaccounted: received - (paid ? invoice : 0) };
}

export type InvoiceState = "unpaid" | "partly" | "paid" | "overpaid";

/** Careful: every deposit is a ledger line on the invoice; the state is the sum. */
export function carefulMatch(invoice: number, deposits: Received[]) {
  const received = deposits.filter((d) => d.settled).reduce((s, d) => s + d.units, 0);
  const state: InvoiceState = received === 0 ? "unpaid" : received < invoice ? "partly" : received === invoice ? "paid" : "overpaid";
  return { state, received, due: Math.max(0, invoice - received), credit: Math.max(0, received - invoice) };
}

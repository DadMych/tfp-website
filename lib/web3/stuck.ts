/**
 * 3.7, pure. A simulated deposit provider sends one webhook per deposit, some
 * late, one never. The careless book only hears the provider; the careful one
 * reads the chain and compares.
 */

/** Height at which the provider's webhook arrives, or null if it never does. */
export const webhookAt = (height: number, needed: number, lag: number | null) => (lag == null ? null : height + needed - 1 + lag);

export type CarelessStatus = "awaiting" | "paid" | "reminder";
export type CarefulStatus = "awaiting" | "confirming" | "paid" | "waiting-provider" | "provider-late" | "provider-silent";

export interface StuckInput {
  /** The deposit's block as the chain shows it (Transfer log), null if none seen. */
  chainHeight: number | null;
  /** Block the provider's webhook arrived at, null if not (yet). */
  webhook: number | null;
  tip: number;
  needed: number;
  /** Blocks past settlement before a missing webhook counts as a problem. */
  grace: number;
}

const settledAt = (h: number, needed: number) => h + needed - 1;

/** The provider is the only source: no webhook, no payment. Past grace, the client gets a reminder for money they sent. */
export function carelessStatus({ chainHeight, webhook, tip, needed, grace }: StuckInput): CarelessStatus {
  if (webhook != null && tip >= webhook) return "paid";
  if (chainHeight != null && tip - settledAt(chainHeight, needed) >= grace) return "reminder";
  return "awaiting";
}

/** The chain is the source; the provider is checked against it. */
export function carefulStatus({ chainHeight, webhook, tip, needed, grace }: StuckInput): CarefulStatus {
  if (chainHeight == null) return "awaiting";
  const settled = settledAt(chainHeight, needed);
  if (tip < settled) return "confirming";
  const heard = webhook != null && tip >= webhook;
  if (heard) return webhook - settled > grace ? "provider-late" : "paid";
  return tip - settled >= grace ? "provider-silent" : "waiting-provider";
}

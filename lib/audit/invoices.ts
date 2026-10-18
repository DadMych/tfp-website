// The broken cabinet's invoices: a static catalogue, one per client, amounts
// straight from the canon price list. Client-safe (no server imports) so the
// report page and the demos share it. The IDOR and pay/webhook demos read it;
// payment attempts live in cab.payments (db/migrations/0022_audit.sql).

import { CLIENTS, type ClientId } from "@/lib/privacy/access";

export interface Invoice {
  number: string;
  client: ClientId;
  label: string;
  /** Whole cents. Money is never a float here, unlike in the cabinet's own code. */
  amountCents: number;
  plan: string;
}

/** You are logged in as this client. Their invoice is the one that should open. */
export const VIEWER: ClientId = "brightlane";

export const INVOICES: Invoice[] = [
  { number: "NW-2026-118", client: "brightlane", label: "Studio retainer · October 2026", amountCents: 580_000, plan: "Studio" },
  { number: "NW-2026-119", client: "kestrel", label: "Partner retainer · October 2026", amountCents: 1_120_000, plan: "Partner" },
  { number: "NW-2026-120", client: "atlas", label: "Studio retainer · October 2026", amountCents: 580_000, plan: "Studio" },
  { number: "NW-2026-121", client: "verdant", label: "Website Sprint · 50% on delivery", amountCents: 700_000, plan: "Website Sprint" },
  { number: "NW-2026-122", client: "tidepool", label: "Partner retainer · October 2026", amountCents: 1_120_000, plan: "Partner" },
];

export const invoiceByNumber = (n: string) => INVOICES.find((i) => i.number === n);
export const ownInvoice = INVOICES.find((i) => i.client === VIEWER)!;
export const clientName = (id: ClientId) => CLIENTS[id];

export function euros(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}€${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

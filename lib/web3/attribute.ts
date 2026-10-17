export interface Invoice {
  id: string;
  units: number;
  address: string;
}

export interface Deposit {
  units: number;
  to: string;
  settled: boolean;
}

/**
 * Careless: every invoice shares one address, so `to` says nothing. Each
 * settled deposit pays the first still-open invoice with the same amount.
 * Returns the invoice id each deposit was credited to (null = no match).
 */
export function carelessAttribute(invoices: Invoice[], deposits: Deposit[]): (string | null)[] {
  const open = new Set(invoices.map((i) => i.id));
  return deposits.map((d) => {
    if (!d.settled) return null;
    const inv = invoices.find((i) => open.has(i.id) && i.units === d.units);
    if (!inv) return null;
    open.delete(inv.id);
    return inv.id;
  });
}

/** Careful: one address per invoice, so the address is the reference. */
export function carefulAttribute(invoices: Invoice[], deposits: Deposit[]): (string | null)[] {
  return deposits.map((d) => (d.settled ? (invoices.find((i) => i.address.toLowerCase() === d.to.toLowerCase())?.id ?? null) : null));
}

import { getAddress, type Address } from "viem";

/** One line of the studio wallet's history, newest first. Nothing here is on chain. */
export interface HistoryRow {
  ago: string;
  dir: "out" | "in";
  amount: number;
  address: Address;
  /** real = last month's payout to the freelancer; zero / fake / dust = the attacker's three tricks. */
  kind: "real" | "zero" | "fake" | "dust" | "other";
}

const AGES = ["4 min ago", "40 min ago", "3 h ago", "yesterday", "2 days ago", "6 days ago", "16 days ago", "19 days ago"];

const hex = (rand: () => number, n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rand() * 16)]).join("");
const randomAddress = (rand: () => number) => getAddress(`0x${hex(rand, 40)}`);

/** Same first four and last four hex characters as `real`, anything in between. What a vanity generator finds in hours. */
export function lookalike(real: Address, rand: () => number): Address {
  const lower = real.toLowerCase();
  let middle = hex(rand, 32);
  while (middle === lower.slice(6, 38)) middle = hex(rand, 32);
  return getAddress(`0x${lower.slice(2, 6)}${middle}${lower.slice(-4)}`);
}

/**
 * Eight rows. The top one is always the attacker's zero-value transfer: it is
 * what a wallet shows first and what a hurried person copies. The real payout
 * sits 6–19 days back, among two more look-alikes and ordinary traffic.
 */
export function makeRound(freelancer: Address, payout: number, rand: () => number = Math.random): { rows: HistoryRow[]; answer: number } {
  const slots: (HistoryRow["kind"] | null)[] = Array(8).fill(null);
  slots[0] = "zero";
  const answer = 5 + Math.floor(rand() * 3);
  slots[answer] = "real";
  const free = () => slots.flatMap((s, i) => (s === null ? [i] : []));
  for (const kind of ["fake", "dust"] as const) {
    const open = free();
    slots[open[Math.floor(rand() * open.length)]] = kind;
  }

  const others: Omit<HistoryRow, "ago" | "kind">[] = [
    { dir: "in", amount: 5_800, address: randomAddress(rand) },
    { dir: "out", amount: 400, address: randomAddress(rand) },
    { dir: "out", amount: 900, address: randomAddress(rand) },
    { dir: "in", amount: 2_400, address: randomAddress(rand) },
  ];
  others.sort(() => rand() - 0.5);

  const rows = slots.map((kind, i): HistoryRow => {
    const ago = AGES[i];
    switch (kind) {
      case "real":
        return { ago, kind, dir: "out", amount: payout, address: freelancer };
      case "zero":
        return { ago, kind, dir: "out", amount: 0, address: lookalike(freelancer, rand) };
      case "fake":
        return { ago, kind, dir: "out", amount: payout, address: lookalike(freelancer, rand) };
      case "dust":
        return { ago, kind, dir: "in", amount: 0.01, address: lookalike(freelancer, rand) };
      default:
        return { ago, kind: "other", ...others.pop()! };
    }
  });
  return { rows, answer };
}

/** What the careless payout does: copy the newest address that looks like the freelancer's. */
export const carelessPick = (rows: HistoryRow[], freelancer: Address) => {
  const looks = (a: string) => a.slice(0, 6).toLowerCase() === freelancer.slice(0, 6).toLowerCase() && a.slice(-4).toLowerCase() === freelancer.slice(-4).toLowerCase();
  return rows.findIndex((r) => looks(r.address));
};

/** What the careful payout does: ignore history, pay the address on the payee list. */
export const carefulPick = (rows: HistoryRow[], payees: Address[]) => rows.findIndex((r) => payees.some((p) => p.toLowerCase() === r.address.toLowerCase()));

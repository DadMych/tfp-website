// ─────────────────────────────────────────────────────────────────────────────
// Money Lab — module registry. One entry per /lab/money/<slug>.
// Modules with status "draft" do not exist publicly: not listed, route 404s.
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleStatus = "live" | "draft";

export interface MoneyModule {
  slug: string;
  /** Short family label shown above the title. */
  kicker: string;
  title: string;
  /** What the visitor will see break and then hold. One or two sentences. */
  proves: string;
  /** The same promise for the Plain English switch. No jargon. */
  plain?: string;
  /** The /work case this bug was lifted from. */
  caseSlug?: string;
  caseLabel?: string;
  /** Which lab.counters keys this module owns, with a display label. */
  counters: { key: string; label: string; format?: "int" | "cents" }[];
  /** Tile colour. Same palette as /lab. */
  color: string;
  /** Text colour on that tile. Black unless the tile is dark. */
  ink?: string;
  status: ModuleStatus;
}

export const moneyModules: MoneyModule[] = [
  {
    slug: "double-spend",
    kicker: "Concurrency",
    title: "Double-Spend",
    proves:
      "You are the attacker. One $100 balance, up to 200 parallel debits, five defences to break. Three of them pay you. Two do not.",
    plain:
      "A card with $100 on it. A hundred $5 payments hit it in the same instant. Three of the five ways to guard it pay out more than $100. You are the one taking the money.",
    caseSlug: "crypto-card",
    caseLabel: "Crypto card: balance checks that did not hold",
    counters: [
      { key: "ds_attacks_total", label: "Attacks" },
      { key: "ds_extracted_cents", label: "Extracted from naive", format: "cents" },
      { key: "ds_defended_extracted_cents", label: "Extracted from defended", format: "cents" },
    ],
    color: "#3B5BFF",
    ink: "#FFFDF5",
    status: "live",
  },
  {
    slug: "idempotency",
    kicker: "Concurrency",
    title: "Idempotency",
    proves:
      "A client retries one charge twenty times at once. No key: twenty charges. A key checked in code: still several. A key enforced by the database: one.",
    plain:
      "A customer's phone retries one payment twenty times at once. With no protection they are charged twenty times. With a half-protection, still several. With the right one, once.",
    caseSlug: "ticketing-rescue",
    caseLabel: "Ticketing: idempotency on three levels",
    counters: [
      { key: "idem_runs_total", label: "Storms" },
      { key: "idem_duplicates_prevented", label: "Duplicate charges refused" },
    ],
    color: "#FF5CAA",
    status: "live",
  },
  {
    slug: "webhooks",
    kicker: "Delivery",
    title: "Webhooks",
    proves:
      "Your own inbox with a signed endpoint. Replay an event five times in parallel, deliver captured before authorized, send a bad signature. Watch the handler stay correct.",
    plain:
      "The card company tells your shop 'payment received' by sending a message. That message can arrive twice, late, in the wrong order, or from an impostor. Here you play the card company.",
    caseSlug: "ticketing-rescue",
    caseLabel: "Ticketing: exactly-once webhook processing",
    counters: [
      { key: "wh_deliveries_total", label: "Deliveries" },
      { key: "wh_duplicates_blocked", label: "Duplicates blocked" },
    ],
    color: "#FF8A3D",
    status: "live",
  },
  {
    slug: "state-machine",
    kicker: "State",
    title: "State Machine",
    proves:
      "A payment with five states. The unguarded version lets you refund a payment twice and capture a voided one. The guarded version has a transition table and a version column.",
    plain:
      "A payment moves through stages: created, reserved, taken, refunded. The careless version lets two clicks refund the same money twice. The careful one says no to the second click.",
    caseSlug: "ticketing-rescue",
    caseLabel: "Ticketing: the refund that ran twice",
    counters: [
      { key: "sm_transitions_total", label: "Transitions" },
      { key: "sm_illegal_blocked", label: "Illegal transitions blocked" },
    ],
    color: "#FFE600",
    status: "live",
  },
  {
    slug: "ledger",
    kicker: "State",
    title: "Ledger",
    proves:
      "Balances stored as numbers drift the first time a process dies between two updates. A double-entry ledger cannot drift: every transaction sums to zero or does not exist.",
    plain:
      "Keep money as one number per account and it drifts the first time something crashes halfway. Keep it the way accountants do, as paired lines, and it cannot.",
    caseSlug: "membership-platform",
    caseLabel: "Membership: money that had to reconcile",
    counters: [
      { key: "lg_transactions_total", label: "Transactions" },
      { key: "lg_drift_prevented_cents", label: "Drift refused", format: "cents" },
    ],
    color: "#B79CFF",
    status: "live",
  },
  {
    slug: "money-math",
    kicker: "Arithmetic",
    title: "Money Math",
    proves:
      "Floats, splits and minor units. Divide $100 by three and get the cent back. Runs in your browser, nothing to store.",
    plain:
      "Computers are bad at decimals: to them $0.10 + $0.20 is not $0.30. Split $100 three ways and a cent goes missing. Here is how to count money so it adds up.",
    counters: [],
    color: "#C6FF3D",
    status: "live",
  },
  {
    slug: "reconciliation",
    kicker: "Operations",
    title: "Reconciliation",
    proves: "Provider statement against the ledger. Inject a missing payout and watch it surface.",
    counters: [],
    color: "#4ECDC4",
    status: "draft",
  },
  {
    slug: "outbox",
    kicker: "Delivery",
    title: "Outbox",
    proves: "Order and event written atomically versus a dual write with a crash in between.",
    counters: [],
    color: "#4ECDC4",
    status: "draft",
  },
  {
    slug: "deposits",
    kicker: "On-chain",
    title: "Deposits",
    proves: "Testnet deposits, confirmations, reorgs, ledger credit after N blocks.",
    counters: [],
    color: "#4ECDC4",
    status: "draft",
  },
];

export const liveModules = moneyModules.filter((m) => m.status === "live");

export function getLiveModule(slug: string): MoneyModule | undefined {
  return liveModules.find((m) => m.slug === slug);
}

export function adjacentModules(slug: string): { prev?: MoneyModule; next?: MoneyModule } {
  const i = liveModules.findIndex((m) => m.slug === slug);
  if (i === -1) return {};
  return {
    prev: i > 0 ? liveModules[i - 1] : undefined,
    next: i < liveModules.length - 1 ? liveModules[i + 1] : undefined,
  };
}

/** Sandbox limits shown on pages and enforced in lib/lab/rate-limit.ts. */
export const moneyLimits = {
  dsRunsPerHour: 120,
  idemRunsPerHour: 60,
  whDeliveriesPerHour: 120,
  smActionsPerHour: 200,
  lgActionsPerHour: 200,
} as const;

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Web3 Lab (Part 3) — chapter registry. One entry per /lab/web3/<slug>.
// Same shape and rules as lib/money-lab.ts: drafts are not listed and 404,
// unless LAB_SHOW_DRAFTS=1 locally.
// ─────────────────────────────────────────────────────────────────────────────

import { showDrafts } from "./lab-config";
import type { MoneyModule } from "./money-lab";

export type Web3Chapter = MoneyModule;

export const web3Chapters: Web3Chapter[] = [
  {
    slug: "confirmations",
    kicker: "Part 3 · Confirmations",
    title: "Confirmations",
    proves:
      "A client pays an invoice in USDC on Sepolia, for real. One watcher marks it paid the moment it lands in a block. The other waits for blocks on top and keeps checking the one it trusted. Then tear that block out and see who already shipped the work.",
    plain:
      "A client pays in digital dollars. One way of checking says 'paid' the second the payment shows up. The other waits a minute and keeps checking. Then make the payment disappear and see who already handed over the work.",
    counters: [
      { key: "w3_deposits_total", label: "Deposits watched", plain: "Payments watched" },
      { key: "w3_careless_lost_units", label: "Marked paid, then gone", plain: "Paid, then vanished" },
    ],
    color: "#B79CFF",
    status: "live",
  },
  {
    slug: "which-invoice",
    kicker: "Part 3 · Matching",
    title: "Which Invoice?",
    proves:
      "Two clients owe the same amount. One pays. A shared address matched by amount credits whichever invoice is first in the list: the wrong client gets marked paid and the right one gets a reminder. One address per invoice can't mix them up.",
    plain:
      "Two clients owe the same amount and one of them pays. If every payment lands in one place, you guess who it was from the amount, and you guess wrong. Give every bill its own address and there's nothing to guess.",
    counters: [
      { key: "w3_which_runs", label: "Invoice pairs", plain: "Pairs of bills" },
      { key: "w3_careless_misattributed_units", label: "Credited to the wrong client", plain: "Booked to the wrong client" },
    ],
    color: "#FF8A3D",
    status: "live",
  },
  {
    slug: "wrong-amount",
    kicker: "Part 3 · Amounts",
    title: "Wrong Amount",
    proves:
      "Clients don't pay the exact number. An exchange keeps a fee, a payment comes in two parts, finance rounds up. Match deposits to invoices by amount and real money lands on no invoice. Keep a ledger per invoice and every cent has a line.",
    plain:
      "People rarely pay the exact amount. A fee gets taken on the way, a payment is split in two, someone rounds up. Look for the exact number and money goes missing in your own books. Write down every payment and nothing does.",
    counters: [
      { key: "w3_wrong_amount_runs", label: "Invoices paid", plain: "Invoices paid" },
      { key: "w3_careless_unmatched_units", label: "Received, on no invoice", plain: "Received, never recorded" },
    ],
    color: "#4ECDC4",
    status: "live",
  },
  {
    slug: "fake-usdc",
    kicker: "Part 3 · Tokens",
    title: "Fake USDC",
    proves:
      "Anyone can deploy a token called \"USD Coin\" with the symbol USDC. We did, on Sepolia. Pay an invoice with it: a watcher that checks the symbol marks it paid. One that checks the contract address books nothing.",
    plain:
      "Anyone can make their own digital dollar and call it USDC. We made one. Pay a bill with it, and a check that reads the name says paid. A check that looks at who issued it isn't fooled.",
    counters: [
      { key: "w3_fake_runs", label: "Fake payments sent", plain: "Fake payments sent" },
      { key: "w3_careless_fake_units", label: "Booked as paid, in fake USDC", plain: "Paid in fake money" },
    ],
    color: "#6EC1FF",
    status: "live",
  },
  {
    slug: "address-poisoning",
    kicker: "Part 3 · Payees",
    title: "Address Poisoning",
    proves:
      "The studio pays a freelancer by copying the address from its own wallet history. An attacker planted look-alikes there: same first four, same last four. Find the real one in 30 seconds, then see what a payee list does instead.",
    plain:
      "The studio pays a freelancer by copying their account number from past payments. A scammer slipped in numbers that start and end the same. Try to spot the real one in 30 seconds, then see the safer way.",
    counters: [
      { key: "w3_poison_rounds", label: "Rounds played", plain: "Rounds played" },
      { key: "w3_poison_fooled", label: "Copied the attacker's address", plain: "Picked the scammer" },
    ],
    color: "#FFB3D9",
    status: "live",
  },
  {
    slug: "payout-twice",
    kicker: "Part 3 · Payouts",
    title: "Paid Twice",
    proves:
      "The studio pays a freelancer and the reply never comes back. Retry by sending again and Etherscan shows two real transfers. Sign once, store the signed transaction, retry with the same bytes: one hash, one payment.",
    plain:
      "The studio pays a freelancer and never hears back. Try again the simple way and the freelancer is paid twice, for real. Save the exact payment before sending and retry that same one, and they're paid once.",
    counters: [
      { key: "w3_payout_runs", label: "Payouts run", plain: "Payouts tried" },
      { key: "w3_careless_overpaid_units", label: "Paid out twice", plain: "Paid twice" },
    ],
    color: "#C6FF3D",
    status: "live",
  },
  {
    slug: "stuck-deposits",
    kicker: "Part 3 · Reconciliation",
    title: "Stuck Deposits",
    proves:
      "Three clients pay for real on Sepolia. The deposit provider's webhooks are simulated: one on time, one late, one never. Trust the provider and a paid client gets a reminder. Read the chain and compare, and the missing webhook is a flag, not a debt.",
    plain:
      "Three clients pay. The service that's meant to tell you about payments tells you about one on time, one late and one never. Trust it, and you chase a client who already paid. Check the payments yourself and you catch it.",
    counters: [
      { key: "w3_stuck_runs", label: "Rounds of three", plain: "Rounds played" },
      { key: "w3_careless_stuck_units", label: "Paid, but chased as unpaid", plain: "Paid, still chased" },
    ],
    color: "#FFD23F",
    status: "live",
  },
];

export const liveChapters = web3Chapters.filter((c) => c.status === "live" || showDrafts);

// TODO(oleksii): client name and invoice amount for the story.
/** The story amount, and the test amount the chain actually moves (USDC has 6 decimals). */
export const invoice = { label: "NW-2026-118", storyUsdc: 5_800, units: BigInt(5_800) } as const;

// TODO(oleksii): client names for the story.
/** 3.2: two clients, same amount, one shared address vs one address per invoice. */
export const whichInvoice = {
  units: 5_800,
  needed: 3,
  clients: [
    { id: "a", name: "Client A", label: "NW-2026-120" },
    { id: "b", name: "Client B", label: "NW-2026-121" },
  ],
} as const;
export type WhichClient = (typeof whichInvoice.clients)[number]["id"];

// TODO(oleksii): which freelancer, for what.
/** 3.6: the studio pays a freelancer and the reply gets lost. */
export const payout = { units: 1_200, label: "Freelancer · October" } as const;

// TODO(oleksii): client names for the story.
/** 3.7: three clients pay, the deposit provider reports one on time, one late, one never. Lags are in blocks. */
export const stuck = {
  units: 5_800,
  needed: 3,
  grace: 2,
  clients: [
    { id: "a", name: "Client A", label: "NW-2026-123", lag: 0 },
    { id: "b", name: "Client B", label: "NW-2026-124", lag: 6 },
    { id: "c", name: "Client C", label: "NW-2026-125", lag: null },
  ],
} as const;
export type StuckClient = (typeof stuck.clients)[number]["id"];

/** 3.5: copy the freelancer's address from a poisoned wallet history. Simulator. */
export const poison = { seconds: 30 } as const;

/** 3.4: one invoice, paid in Circle's USDC or in the lab's own "USD Coin". */
export const fakeUsdc = { label: "NW-2026-122", units: 5_800, needed: 3 } as const;
export type FakeUsdcToken = "real" | "fake";

/** 3.3: one invoice, four ways a client actually pays it. Amounts are story USDC and test units at once. */
export const wrongAmount = {
  invoice: { label: "NW-2026-119", units: 5_800 },
  /** Both matchers wait this many blocks: this chapter is about amounts, not reorgs. */
  needed: 3,
  scenarios: [
    { id: "exact", label: "Exact", parts: [5_800], why: "Pays 5,800, as invoiced." },
    { id: "short", label: "Fee taken", parts: [5_785], why: "The client's exchange kept 15 on the way out." },
    { id: "split", label: "Two parts", parts: [3_000, 2_800], why: "Half now, the rest after the call." },
    { id: "over", label: "Rounded up", parts: [6_000], why: "Their finance team rounded up to 6,000." },
  ],
} as const;
export type WrongAmountScenario = (typeof wrongAmount.scenarios)[number]["id"];

export const web3Limits = {
  /** Real transfers per IP per hour. Each costs Sepolia gas from one wallet. */
  paysPerHour: 6,
  /** Real transfers per day, everyone together. */
  paysPerDay: 120,
  /** Deepest block the simulator will tear out. */
  maxTear: 12,
} as const;

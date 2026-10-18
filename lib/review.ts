// ─────────────────────────────────────────────────────────────────────────────
// /review — Payments Risk Review. The offer, and the 2-minute self-check that
// leads into it. Facts only; anything Oleksii has to decide is TODO(oleksii).
// ─────────────────────────────────────────────────────────────────────────────

export const offer = {
  name: "Application Audit",
  kicker: "Fixed scope · fixed price · written report",
  promise: "I go through the app you're about to launch and tell you where it loses money, data or trust — ranked, with the fix for each, and a way to reproduce every one.",
  duration: "from 5 working days",
  price: "from €3,300",
  who: [
    "You have an app that works in a demo — often built fast, or with AI tools — and a launch date close enough to be nervous about.",
    "You take payments or hold other people's data, and nobody has checked the code that does it from the outside.",
    "A customer, an investor or an auditor just asked “how do you know this is safe?”, and you want a straight answer.",
  ],
  notFor: "Not for: a design review, a performance pass, or building the features themselves. I do those as separate work.",
  days: [
    { when: "Day 1", what: "Read access to the repo and an hour with whoever owns it. I run it myself and map how it fits together: how you log in, where the data lives, how money moves, what the AI reads." },
    { when: "Days 2–4", what: "I read the code and the database, trace real actions, and try to break it: who can see what, how a payment is taken, what leaves for the AI, and what the backups, secrets and deploys look like. Where I can, I reproduce the failure against a copy." },
    { when: "Day 5", what: "Written report and a one-hour call. Every finding has a severity, where it lives, how to reproduce it, and the fix." },
  ],
  deliverables: [
    "Ranked findings: what hurts first.",
    "Reproduction steps for each, so your team can verify before and after.",
    "The fix, as a diff or as SQL, not as a paragraph.",
    "What to monitor so the same class of bug cannot return quietly.",
  ],
} as const;

/* ── The five areas an audit covers. Each maps to a Part of the lab. ── */

export interface AuditArea {
  id: string;
  title: string;
  failure: string;
  check: string;
  part: { label: string; href: string };
}

export const auditAreas: AuditArea[] = [
  {
    id: "access",
    title: "Access & tenancy",
    failure: "One client opens another's data by changing a number in the address, or a full-rights key sits in the browser and ignores every rule.",
    check: "Whether every request proves the thing is yours — in the code and again in the database.",
    part: { label: "Part 4.1", href: "/lab/privacy/someone-elses-files" },
  },
  {
    id: "money",
    title: "Payments",
    failure: "A charge runs twice, a forged message marks an invoice paid, money is a decimal that drifts a cent at a time.",
    check: "Idempotency keys, webhook signatures, balances in whole cents. The 10-question self-check below is this area.",
    part: { label: "Part 2", href: "/lab/money" },
  },
  {
    id: "ai",
    title: "The AI",
    failure: "The support bot reads every client's files to answer anyone, and personal data in a brief leaves for the model.",
    check: "Whether the AI only reads what the person asking may see, and what gets swapped out before anything is sent.",
    part: { label: "Part 4.2", href: "/lab/privacy/bot-knows-too-much" },
  },
  {
    id: "data",
    title: "The data",
    failure: "Deleted files still answer, share links never expire, and nobody can say who opened what.",
    check: "Real deletion, links that are signed and expire, and a log of who looked that can't be quietly edited.",
    part: { label: "Part 4", href: "/lab/privacy" },
  },
  {
    id: "infra",
    title: "Backups, secrets, releases",
    failure: "Backups that were never restored, secrets printed to the logs, releases straight to production from a laptop.",
    check: "A restore that's actually been tested, secrets kept out of logs, a staging copy and a way to roll back.",
    part: { label: "Part 5", href: "/lab/audit" },
  },
];

/* ── What the review checks. Each area maps to a lab module that shows the failure live. ── */

export interface Area {
  id: string;
  title: string;
  failure: string;
  check: string;
  /** /lab/money/<slug> if a live demo exists. */
  demo?: string;
}

export const areas: Area[] = [
  {
    id: "race",
    title: "Balance races",
    failure: "Two payments read the same balance at the same moment. Both approve. The business pays out money it never had.",
    check: "Where the “enough money?” decision happens: in application code, or inside the database in the statement that deducts.",
    demo: "double-spend",
  },
  {
    id: "dup",
    title: "Duplicate charges",
    failure: "A retry, a double click or a flaky network creates the same charge twice. The customer notices first.",
    check: "Idempotency keys from the client through to the database constraint, not just at the HTTP layer.",
    demo: "idempotency",
  },
  {
    id: "webhook",
    title: "Webhook replay and order",
    failure: "The provider sends an event twice, or “captured” before “authorized”. Orders end up paid-and-unpaid at once.",
    check: "Signature verification, deduplication by event id, and whether late events can move an order backwards.",
    demo: "webhooks",
  },
  {
    id: "state",
    title: "Illegal state changes",
    failure: "Two support agents refund the same order in the same second. Or an order is captured after it was cancelled.",
    check: "Whether the allowed transitions are enforced by the database, or only by the buttons the UI happens to show.",
    demo: "state-machine",
  },
  {
    id: "ledger",
    title: "Ledger drift",
    failure: "Balances are numbers that get overwritten. Nobody can explain how a customer got to $−13.40.",
    check: "Whether every balance can be rebuilt from entries, and whether the sum of all entries is forced to be zero.",
    demo: "ledger",
  },
  {
    id: "recon",
    title: "Reconciliation",
    failure: "Your database and the provider's settlement report disagree, and nobody finds out until month end.",
    check: "Whether the difference is computed daily and by machine, and what happens to the rows that do not match.",
  },
];

/* ── The 2-minute check. Three answers per question; “no” and “not sure” both count. ── */

export type Answer = "yes" | "unsure" | "no";

export interface Question {
  id: string;
  area: Area["id"];
  /** Weight 1–3. Multiplied by the answer score (yes 0, unsure 1, no 2). */
  weight: 1 | 2 | 3;
  q: string;
  yes: string;
  /** What is probably true if the answer is no or unsure. Plain English. */
  risk: string;
  /** What I would look at first in the review. */
  look: string;
}

export const questions: Question[] = [
  {
    id: "idem",
    area: "dup",
    weight: 3,
    q: "If a customer double-clicks Pay, or your app retries after a timeout, can the same charge be created twice?",
    yes: "No. Every charge carries an idempotency key and the database refuses a second one.",
    risk: "Retries happen whether you planned for them or not. Without a key enforced at the database, some customers are already being charged twice; you find out from chargebacks.",
    look: "The charge endpoint, what key it accepts, and whether that key is a UNIQUE constraint or an if-statement.",
  },
  {
    id: "balance",
    area: "race",
    weight: 3,
    q: "Where is “does this customer have enough balance or credit?” decided: in your application code, or inside the database in the same statement that deducts it?",
    yes: "In the database. One UPDATE with the condition in the WHERE, or a row lock across the decision.",
    risk: "A check in application code has a gap between reading the balance and writing it. Enough parallel requests fit through that gap, and every one of them is approved.",
    look: "The debit path. I will run concurrent debits against a copy and count how many approve.",
  },
  {
    id: "refund_twice",
    area: "state",
    weight: 3,
    q: "Can the same order be refunded twice if two people click at the same moment?",
    yes: "No. The refund transition is enforced in the database and the second attempt fails.",
    risk: "If the UI is the only thing preventing a second refund, a second refund will happen. I met exactly this bug in production on a ticketing platform. It was real money.",
    look: "The refund handler and the order table: is there a version column or a state check in the UPDATE itself?",
  },
  {
    id: "states",
    area: "state",
    weight: 2,
    q: "Is there a written list of order states and allowed transitions that the code cannot step outside of?",
    yes: "Yes, and the database rejects any transition not on the list.",
    risk: "Without an explicit list, every new feature adds a new path, and some of those paths lead to “captured after cancelled”.",
    look: "Every place that writes the status column. Usually there are more than anyone remembers.",
  },
  {
    id: "wh_sig",
    area: "webhook",
    weight: 3,
    q: "Do you verify the signature on every webhook from your payment provider before acting on it?",
    yes: "Yes, with the provider's secret, and unsigned or wrong-signed requests are rejected.",
    risk: "An unsigned webhook endpoint lets anyone on the internet mark an order as paid by sending one HTTP request.",
    look: "The webhook route: signature check first, body parsing second, and a constant-time comparison.",
  },
  {
    id: "wh_dup",
    area: "webhook",
    weight: 2,
    q: "If the provider sends the same webhook twice (they do), does your system act on it once?",
    yes: "Yes. Event ids are stored and a repeat is acknowledged but ignored.",
    risk: "Providers retry on any slow response. Without deduplication by event id, one payment can be credited twice, or one email sent five times.",
    look: "Whether there is an events table with the provider's id as primary key, and whether processing happens in the same transaction as the insert.",
  },
  {
    id: "wh_order",
    area: "webhook",
    weight: 2,
    q: "If “captured” arrives before “authorized”, does the order still end up in the right state?",
    yes: "Yes. Events carry a timestamp or sequence and an older event cannot move the order backwards.",
    risk: "Webhooks are not delivered in order. Without ordering rules, a late “authorized” overwrites “captured” and the order looks unpaid.",
    look: "How the order's state is updated from an event: unconditional SET, or compared against what is already there.",
  },
  {
    id: "ledger",
    area: "ledger",
    weight: 2,
    q: "Can you rebuild any customer's balance from a list of entries, or is the balance a single number that gets overwritten?",
    yes: "From entries. The stored balance is a cache and I can prove it equals the sum.",
    risk: "An overwritten balance has no history. When it is wrong, and eventually it is, nobody can say which operation made it wrong or by how much.",
    look: "Whether there is an entries table, whether debits and credits are forced to balance, and how the cached number is kept honest.",
  },
  {
    id: "recon",
    area: "recon",
    weight: 2,
    q: "Do you compare your records against the provider's settlement report automatically, and do you know yesterday's difference?",
    yes: "Yes, daily, by machine, and mismatches land in a queue someone owns.",
    risk: "Without daily reconciliation, the gap between your books and the provider's grows until finance finds it at month end.",
    look: "Whether a reconciliation job exists, what it compares, and what happens to a row that does not match.",
  },
  {
    id: "cents",
    area: "ledger",
    weight: 1,
    q: "Is money stored as whole minor units (cents) in integers, never as floating-point numbers?",
    yes: "Integers everywhere, currency stored next to the amount.",
    risk: "Floats cannot represent 0.10 exactly. Sums drift by a cent, then by more, and reconciliation never closes.",
    look: "Column types on every money field, and how amounts are split, rounded and summed in code.",
  },
];

export const answerScore: Record<Answer, number> = { yes: 0, unsure: 1, no: 2 };
export const maxScore = questions.reduce((s, q) => s + q.weight * 2, 0);

export function exposure(score: number): { level: "low" | "medium" | "high"; label: string; plain: string } {
  const r = score / maxScore;
  if (r < 0.15) return { level: "low", label: "Low exposure", plain: "The basics are in place. A review would look for the second-order problems." };
  if (r < 0.45) return { level: "medium", label: "Medium exposure", plain: "Some of these are probably costing money already, quietly." };
  return { level: "high", label: "High exposure", plain: "More than one of these is likely live in production right now." };
}

/** Compact share code: one char per question in `questions` order. */
export function encodeAnswers(a: Record<string, Answer>): string {
  return questions.map((q) => (a[q.id] === "yes" ? "y" : a[q.id] === "no" ? "n" : a[q.id] === "unsure" ? "u" : "-")).join("");
}
export function decodeAnswers(code: string | null): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  if (!code) return out;
  questions.forEach((q, i) => {
    const c = code[i];
    if (c === "y") out[q.id] = "yes";
    else if (c === "n") out[q.id] = "no";
    else if (c === "u") out[q.id] = "unsure";
  });
  return out;
}

// Double-Spend: five defence levels. Shared by the route handler and the page,
// so what the UI says and what the server runs cannot drift apart.

export type Level = 0 | 1 | 2 | 3 | 4;

export interface LevelDef {
  id: Level;
  name: string;
  /** Same thing for someone who does not write SQL. */
  plain: string;
  /** One line of what the code does. */
  tech: string;
  /** How you beat it, or why you cannot. */
  hole: string;
  holePlain: string;
  holds: boolean;
  tag: string;
  code: string;
}

export const LEVELS: LevelDef[] = [
  {
    id: 0,
    name: "No check",
    plain: "Trusts every request",
    tech: "UPDATE accounts SET balance = balance − x",
    hole: "Nothing looks at the balance. It goes negative and keeps going.",
    holePlain: "The card never says no. Spend a thousand dollars on a hundred-dollar card.",
    holds: false,
    tag: "seen in MVPs",
    code: `// Level 0 — nobody checks
await db.query(
  "UPDATE accounts SET balance_cents = balance_cents - $2 WHERE id = $1",
  [accountId, amount]
);
return "approved";`,
  },
  {
    id: 1,
    name: "Check in code",
    plain: "Looks, then decides, then writes",
    tech: "SELECT balance → if (balance ≥ x) → UPDATE SET balance = read − x",
    hole: "Two round trips. Every request that reads before the first one writes sees the old balance.",
    holePlain: "Ten cashiers look at the same number at the same moment. All ten say yes.",
    holds: false,
    tag: "the ORM default",
    code: `// Level 1 — load, check, save
const { rows: [acct] } = await db.query(
  "SELECT balance_cents FROM accounts WHERE id = $1",
  [accountId]
);
if (acct.balance_cents < amount) return "declined";

await db.query(
  "UPDATE accounts SET balance_cents = $2 WHERE id = $1",
  [accountId, acct.balance_cents - amount]   // ← stale number
);
return "approved";`,
  },
  {
    id: 2,
    name: "In-memory lock",
    plain: "A queue inside the app",
    tech: "mutex per account in process memory, then Level 1",
    hole: "Works on one server. Production has two. Each has its own lock and neither knows about the other.",
    holePlain: "Two shops, each with its own queue, both selling from the same stock. Passes every test on a laptop.",
    holds: false,
    tag: "passes QA, fails in prod",
    code: `// Level 2 — serialize in the app. Fine on one instance.
const locks = new Map<string, Promise<void>>();

async function withLock(key, fn) {
  const prev = locks.get(key) ?? Promise.resolve();
  let release;
  locks.set(key, new Promise((r) => (release = r)));
  await prev;
  try { return await fn(); } finally { release(); }
}

return withLock(accountId, () => levelOne(accountId, amount));
// This lab runs two "instances": requests alternate between two lock maps,
// which is exactly what two pods behind a load balancer do.`,
  },
  {
    id: 3,
    name: "Row lock",
    plain: "The database queues them",
    tech: "BEGIN · SELECT … FOR UPDATE · if · UPDATE · COMMIT",
    hole: "Holds. Every request waits for the row. Correct, and the slowest option here: watch the timeline stack up.",
    holePlain: "One till, one line. Nobody gets served until the person in front is done. Safe, and slow at rush hour.",
    holds: true,
    tag: "correct, serialized",
    code: `// Level 3 — lock the row for the length of the decision
await client.query("BEGIN");
const { rows: [acct] } = await client.query(
  "SELECT balance_cents FROM accounts WHERE id = $1 FOR UPDATE",
  [accountId]
);
if (acct.balance_cents < amount) { await client.query("ROLLBACK"); return "declined"; }

await client.query(
  "UPDATE accounts SET balance_cents = balance_cents - $2 WHERE id = $1",
  [accountId, amount]
);
await client.query("COMMIT");
return "approved";`,
  },
  {
    id: 4,
    name: "One statement + CHECK",
    plain: "Decision and write are the same action",
    tech: "UPDATE … SET balance = balance − x WHERE balance ≥ x RETURNING",
    hole: "Holds. Postgres evaluates the condition under the row lock and writes or refuses in one step. The CHECK constraint stands behind it.",
    holePlain: "The vault door only opens if the money is inside, and it is the door that checks, not the clerk.",
    holds: true,
    tag: "what I ship",
    code: `// Level 4 — let the database decide
const { rows } = await db.query(
  \`UPDATE accounts
      SET balance_cents = balance_cents - $2
    WHERE id = $1 AND balance_cents >= $2
RETURNING balance_cents\`,
  [accountId, amount]
);
return rows.length === 1 ? "approved" : "declined";

// schema: CHECK (balance_cents >= 0)
// If a future refactor forgets the WHERE, this still refuses.`,
  },
];

export const ATTACK = {
  startCents: 10_000,
  requests: { min: 20, max: 200, default: 100 },
  concurrency: { min: 1, max: 40, default: 20 },
  amounts: [100, 500, 2_000, 5_000] as const,
  defaultAmount: 500 as const,
} as const;

export type AmountCents = (typeof ATTACK.amounts)[number];

export interface AttackParams {
  level: Level;
  requests: number;
  concurrency: number;
  amount: AmountCents;
}

export function validateParams(body: unknown): AttackParams | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const level = Number(b.level);
  const requests = Number(b.requests ?? ATTACK.requests.default);
  const concurrency = Number(b.concurrency ?? ATTACK.concurrency.default);
  const amount = Number(b.amount ?? ATTACK.defaultAmount);
  if (!Number.isInteger(level) || level < 0 || level > 4) return "level must be 0–4";
  if (!Number.isInteger(requests) || requests < ATTACK.requests.min || requests > ATTACK.requests.max) return `requests must be ${ATTACK.requests.min}–${ATTACK.requests.max}`;
  if (!Number.isInteger(concurrency) || concurrency < ATTACK.concurrency.min || concurrency > ATTACK.concurrency.max)
    return `concurrency must be ${ATTACK.concurrency.min}–${ATTACK.concurrency.max}`;
  if (!(ATTACK.amounts as readonly number[]).includes(amount)) return `amount must be one of ${ATTACK.amounts.join(", ")}`;
  return { level: level as Level, requests, concurrency, amount: amount as AmountCents };
}

/**
 * Money the attacker walked away with that the balance never paid for.
 * funded = how much of the spend the $100 actually covered, clamped to [0, start].
 */
export function extracted(approved: number, amount: number, start: number, finalBalance: number): number {
  const funded = Math.max(0, Math.min(start, start - finalBalance));
  return Math.max(0, approved * amount - funded);
}

export type Outcome = "approved" | "declined" | "refused";

export interface RequestEvent {
  seq: number;
  worker: number;
  outcome: Outcome;
  read: number | null;
  after: number | null;
  t0: number;
  tRead: number | null;
  t1: number;
}

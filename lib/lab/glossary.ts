// Terms that get a "?" popover anywhere in the lab. Plain first, then precise.

export const GLOSSARY = {
  race: {
    term: "race condition",
    plain: "Two things happen at the same time and the result depends on which one finishes first. Money systems lose money in exactly that gap.",
    tech: "Concurrent operations whose outcome depends on interleaving. Here: two requests read the same balance before either writes.",
  },
  round_trip: {
    term: "round trip",
    plain: "One question to the database and its answer. A few milliseconds. Long enough for a hundred other questions to arrive.",
    tech: "One network request/response between app and Postgres. The check-then-write gap is at least one of these.",
  },
  row_lock: {
    term: "row lock",
    plain: "The database lets one request hold a record while it decides. Everyone else waits in line for that record.",
    tech: "FOR UPDATE or any UPDATE takes an exclusive row lock until COMMIT; concurrent writers block and re-evaluate on wake.",
  },
  transaction: {
    term: "transaction",
    plain: "A group of changes that either all happen or none do.",
    tech: "BEGIN … COMMIT. Atomic, isolated per the isolation level; Postgres default READ COMMITTED.",
  },
  check: {
    term: "CHECK constraint",
    plain: "A rule written into the table itself. The database refuses any change that breaks it, no matter who sends it.",
    tech: "Table-level predicate enforced on every write. CHECK (balance_cents >= 0) survives refactors the code path does not.",
  },
  in_memory_lock: {
    term: "in-memory lock",
    plain: "A queue that lives inside one copy of the app. A second copy of the app has its own queue and cannot see the first.",
    tech: "A mutex in process memory. Correct within one process, meaningless across instances behind a load balancer.",
  },
  load_balancer: {
    term: "load balancer",
    plain: "The thing that spreads incoming requests across several copies of the app. Production always has more than one copy.",
    tech: "Distributes requests across replicas; two consecutive requests routinely land on different instances.",
  },
  concurrency: {
    term: "concurrency",
    plain: "How many requests are in the air at once. One means they queue politely. Forty means they all arrive together.",
    tech: "Number of requests in flight simultaneously; here enforced by that many worker loops pulling from a shared counter.",
  },
  extracted: {
    term: "extracted",
    plain: "Money the attacker walked away with that the balance never paid for. The business's loss.",
    tech: "approved × amount − funded, where funded = clamp(start − final, 0, start).",
  },
  declined: {
    term: "declined",
    plain: "The system said no: not enough money.",
    tech: "The check failed; for Level 4 that means UPDATE … WHERE balance >= x matched zero rows.",
  },
  idempotency: {
    term: "idempotency",
    plain: "Doing the same thing twice has the same effect as doing it once. Essential, because retries happen whether you like it or not.",
    tech: "f(f(x)) = f(x). For charges: a key that lets the server recognise a repeat and replay the stored response.",
  },
  stale: {
    term: "stale read",
    plain: "A number that was true a moment ago and is not any more.",
    tech: "A value read before a concurrent write committed; decisions made on it are made on the past.",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

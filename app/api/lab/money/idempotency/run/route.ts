import { getPool, sql } from "@/lib/db";
import { bump, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sseResponse, tooMany } from "@/lib/lab/request";
import { moneyLimits } from "@/lib/money-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How many identical taps a visitor can send. 2 = a double-tap, 20 = a retry storm. */
const TAPS = [2, 5, 20] as const;
const AMOUNT_CENTS = 4900;

type Level = "none" | "check_then_insert" | "unique_key";
type Outcome = "charged" | "double_charged" | "replayed";
interface Result {
  level: Level;
  seq: number;
  outcome: Outcome;
  ms: number;
}

/** GET → { limit, remaining, resetAt } for this visitor, without spending a run. */
export async function GET(req: Request) {
  const r = await peekRateLimit(req, "idem_run", moneyLimits.idemRunsPerHour);
  return Response.json({ limit: r.limit, remaining: r.remaining, resetAt: r.resetAt }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/lab/money/idempotency/run  { attempts?: 2 | 5 | 20 }
 * One client, one order, one Idempotency-Key, `attempts` identical requests at
 * once. Three handlers see the same storm. Each result is streamed.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { attempts?: number };
  const ATTEMPTS = TAPS.find((n) => n === body.attempts) ?? 20;
  const rl = await rateLimit(req, "idem_run", moneyLimits.idemRunsPerHour);
  if (!rl.ok) return tooMany(rl);

  await sql("DELETE FROM idem.runs WHERE created_at < now() - interval '24 hours'");

  const [run] = await sql<{ id: string }>("INSERT INTO idem.runs (ip_hash, attempts, amount_cents) VALUES ($1, $2, $3) RETURNING id", [
    ipHash(req),
    ATTEMPTS,
    AMOUNT_CENTS,
  ]);
  const key = `order_${run.id.slice(0, 8)}`;

  const { response, send, close } = sseResponse(rateLimitHeaders(rl));
  const pool = getPool();
  const results: Result[] = [];
  const charged: Record<Level, number> = { none: 0, check_then_insert: 0, unique_key: 0 };

  function record(level: Level, seq: number, didCharge: boolean, t0: number) {
    let outcome: Outcome = "replayed";
    if (didCharge) {
      charged[level] += 1;
      outcome = charged[level] === 1 ? "charged" : "double_charged";
    }
    const r: Result = { level, seq, outcome, ms: Date.now() - t0 };
    results.push(r);
    send("request", r);
  }

  // Level 0: no key at all. Every request is a new charge.
  async function none(seq: number) {
    const t0 = Date.now();
    await pool.query("INSERT INTO idem.charges (run_id, level, idem_key, amount_cents, seq) VALUES ($1, 'none', $2, $3, $4)", [
      run.id,
      key,
      AMOUNT_CENTS,
      seq,
    ]);
    record("none", seq, true, t0);
  }

  // Level 1, the common wrong one: look the key up, then charge, then remember it.
  async function checkThenInsert(seq: number) {
    const t0 = Date.now();
    const client = await pool.connect();
    try {
      const seen = await client.query("SELECT 1 FROM idem.key_log WHERE run_id = $1 AND idem_key = $2 LIMIT 1", [run.id, key]);
      if (seen.rowCount) {
        record("check_then_insert", seq, false, t0);
        return;
      }
      const {
        rows: [{ id }],
      } = await client.query<{ id: string }>(
        "INSERT INTO idem.charges (run_id, level, idem_key, amount_cents, seq) VALUES ($1, 'check_then_insert', $2, $3, $4) RETURNING id",
        [run.id, key, AMOUNT_CENTS, seq]
      );
      await client.query("INSERT INTO idem.key_log (run_id, idem_key, charge_id) VALUES ($1, $2, $3)", [run.id, key, id]);
      record("check_then_insert", seq, true, t0);
    } finally {
      client.release();
    }
  }

  // Level 2: claim the key with a primary key insert, inside the transaction
  // that creates the charge. Losers block, then get zero rows, then replay.
  async function uniqueKey(seq: number) {
    const t0 = Date.now();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const claim = await client.query("INSERT INTO idem.keys (run_id, idem_key) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING idem_key", [run.id, key]);
      if (claim.rowCount === 0) {
        await client.query("ROLLBACK");
        // Stored response from the winner. In production: return it verbatim.
        await client.query("SELECT response FROM idem.keys WHERE run_id = $1 AND idem_key = $2", [run.id, key]);
        record("unique_key", seq, false, t0);
        return;
      }
      const {
        rows: [{ id }],
      } = await client.query<{ id: string }>(
        "INSERT INTO idem.charges (run_id, level, idem_key, amount_cents, seq) VALUES ($1, 'unique_key', $2, $3, $4) RETURNING id",
        [run.id, key, AMOUNT_CENTS, seq]
      );
      await client.query("UPDATE idem.keys SET charge_id = $3, response = $4 WHERE run_id = $1 AND idem_key = $2", [
        run.id,
        key,
        id,
        JSON.stringify({ status: 201, charge_id: id, amount_cents: AMOUNT_CENTS }),
      ]);
      await client.query("COMMIT");
      record("unique_key", seq, true, t0);
    } catch (e) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  (async () => {
    const started = Date.now();
    try {
      send("start", { runId: run.id, key, attempts: ATTEMPTS, amount: AMOUNT_CENTS, remaining: rl.remaining });

      const fire = (fn: (seq: number) => Promise<void>) => Promise.all(Array.from({ length: ATTEMPTS }, (_, i) => fn(i + 1)));
      send("phase", { level: "none" });
      await fire(none);
      send("phase", { level: "check_then_insert" });
      await fire(checkThenInsert);
      send("phase", { level: "unique_key" });
      await fire(uniqueKey);

      const duration = Date.now() - started;
      await sql("UPDATE idem.runs SET none_charges = $2, check_charges = $3, unique_charges = $4, duration_ms = $5 WHERE id = $1", [
        run.id,
        charged.none,
        charged.check_then_insert,
        charged.unique_key,
        duration,
      ]);
      await bump("idem_runs_total");
      await bump("idem_duplicates_prevented", ATTEMPTS - charged.unique_key);

      send("summary", {
        runId: run.id,
        charges: charged,
        billed: {
          none: charged.none * AMOUNT_CENTS,
          check_then_insert: charged.check_then_insert * AMOUNT_CENTS,
          unique_key: charged.unique_key * AMOUNT_CENTS,
        },
        durationMs: duration,
      });
    } catch (err) {
      console.error("[idem/run]", err);
      send("error", { message: "run failed" });
    } finally {
      close();
    }
  })();

  return response;
}

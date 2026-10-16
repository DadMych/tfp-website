import type { PoolClient } from "pg";
import { getPool, sql } from "@/lib/db";
import { badRequest, bump, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, sseResponse, tooMany } from "@/lib/lab/request";
import { ATTACK, extracted, validateParams, type Level, type Outcome, type RequestEvent } from "@/lib/lab/double-spend";
import { moneyLimits } from "@/lib/money-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/lab/money/double-spend/run  { level, requests, concurrency, amount }
 *
 * The attacker fires `requests` debits with `concurrency` in flight against
 * one account defended at `level`. Every request is timed (start, read, end)
 * relative to the attack start and streamed, so the page can draw how they
 * overlapped. No artificial delay anywhere.
 */
/** GET → { limit, remaining, resetAt } for this visitor, without spending an attack. */
export async function GET(req: Request) {
  const r = await peekRateLimit(req, "ds_attack", moneyLimits.dsRunsPerHour);
  return Response.json({ limit: r.limit, remaining: r.remaining, resetAt: r.resetAt }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const params = validateParams(await req.json().catch(() => ({})));
  if (typeof params === "string") return badRequest(params);
  const { level, requests, concurrency, amount } = params;

  const rl = await rateLimit(req, "ds_attack", moneyLimits.dsRunsPerHour);
  if (!rl.ok) return tooMany(rl);

  await sql("DELETE FROM ds.attacks WHERE created_at < now() - interval '24 hours'");

  const START = ATTACK.startCents;
  const [attack] = await sql<{ id: string }>(
    `INSERT INTO ds.attacks (ip_hash, session_id, level, requests, concurrency, amount_cents, start_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [ipHash(req), sessionId(req), level, requests, concurrency, amount, START]
  );
  await sql("INSERT INTO ds.accounts (attack_id, level, balance_cents) VALUES ($1, $2, $3)", [attack.id, level, START]);

  const { response, send, close } = sseResponse(rateLimitHeaders(rl));
  const pool = getPool();
  const events: RequestEvent[] = [];
  // Open every connection before the clock starts, so the timeline measures the defence, not TLS handshakes.
  const warm = await Promise.all(Array.from({ length: concurrency }, () => pool.connect()));
  warm.forEach((c) => c.release());
  const base = performance.now();
  const now = () => Math.round(performance.now() - base);

  const readBalance = async (c: PoolClient | typeof pool, forUpdate = false) => {
    const { rows } = await c.query<{ balance_cents: number }>(
      `SELECT balance_cents FROM ds.accounts WHERE attack_id = $1${forUpdate ? " FOR UPDATE" : ""}`,
      [attack.id]
    );
    return rows[0].balance_cents;
  };

  type Step = { outcome: Outcome; read: number | null; after: number | null; tRead: number | null };

  // ── Level 0: nobody checks ───────────────────────────────────────────────
  async function level0(): Promise<Step> {
    const { rows } = await pool.query<{ balance_cents: number }>(
      "UPDATE ds.accounts SET balance_cents = balance_cents - $2 WHERE attack_id = $1 RETURNING balance_cents",
      [attack.id, amount]
    );
    return { outcome: "approved", read: null, after: rows[0].balance_cents, tRead: null };
  }

  // ── Level 1: load, check, save ───────────────────────────────────────────
  async function level1(): Promise<Step> {
    const client = await pool.connect();
    try {
      const read = await readBalance(client);
      const tRead = now();
      if (read < amount) return { outcome: "declined", read, after: read, tRead };
      const after = read - amount;
      await client.query("UPDATE ds.accounts SET balance_cents = $2 WHERE attack_id = $1", [attack.id, after]);
      return { outcome: "approved", read, after, tRead };
    } finally {
      client.release();
    }
  }

  // ── Level 2: in-process mutex, two "instances" ───────────────────────────
  // Requests alternate between two lock maps. Within an instance they queue;
  // across instances they race, exactly like two pods behind a load balancer.
  const instances: Promise<void>[] = [Promise.resolve(), Promise.resolve()];
  async function level2(seq: number): Promise<Step> {
    const inst = seq % 2;
    const prev = instances[inst];
    let release!: () => void;
    instances[inst] = new Promise<void>((r) => (release = r));
    await prev;
    try {
      return await level1();
    } finally {
      release();
    }
  }

  // ── Level 3: SELECT … FOR UPDATE inside a transaction ────────────────────
  async function level3(): Promise<Step> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const read = await readBalance(client, true);
      const tRead = now();
      if (read < amount) {
        await client.query("ROLLBACK");
        return { outcome: "declined", read, after: read, tRead };
      }
      const { rows } = await client.query<{ balance_cents: number }>(
        "UPDATE ds.accounts SET balance_cents = balance_cents - $2 WHERE attack_id = $1 RETURNING balance_cents",
        [attack.id, amount]
      );
      await client.query("COMMIT");
      return { outcome: "approved", read, after: rows[0].balance_cents, tRead };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => undefined);
      if ((e as { constraint?: string }).constraint === "defended_never_negative") return { outcome: "refused", read: null, after: null, tRead: null };
      throw e;
    } finally {
      client.release();
    }
  }

  // ── Level 4: one statement, condition in the WHERE ───────────────────────
  async function level4(): Promise<Step> {
    try {
      const { rows } = await pool.query<{ balance_cents: number }>(
        `UPDATE ds.accounts SET balance_cents = balance_cents - $2
          WHERE attack_id = $1 AND balance_cents >= $2 RETURNING balance_cents`,
        [attack.id, amount]
      );
      if (rows.length === 1) return { outcome: "approved", read: null, after: rows[0].balance_cents, tRead: null };
      const after = await readBalance(pool);
      return { outcome: "declined", read: after, after, tRead: null };
    } catch (e) {
      if ((e as { constraint?: string }).constraint === "defended_never_negative") return { outcome: "refused", read: null, after: null, tRead: null };
      throw e;
    }
  }

  const run = (lvl: Level, seq: number): Promise<Step> =>
    lvl === 0 ? level0() : lvl === 1 ? level1() : lvl === 2 ? level2(seq) : lvl === 3 ? level3() : level4();

  (async () => {
    try {
      send("start", { attackId: attack.id, level, requests, concurrency, amount, start: START, remaining: rl.remaining });

      // `concurrency` workers pull the next request number from a shared counter.
      let next = 1;
      const worker = async (w: number) => {
        for (;;) {
          const seq = next++;
          if (seq > requests) return;
          const t0 = now();
          const step = await run(level, seq);
          const ev: RequestEvent = { seq, worker: w, outcome: step.outcome, read: step.read, after: step.after, t0, tRead: step.tRead, t1: now() };
          events.push(ev);
          send("req", ev);
        }
      };
      await Promise.all(Array.from({ length: concurrency }, (_, w) => worker(w)));

      const finalBalance = await readBalance(pool);
      const approved = events.filter((e) => e.outcome === "approved").length;
      const loot = extracted(approved, amount, START, finalBalance);
      const duration = now();

      await sql(
        `INSERT INTO ds.requests (attack_id, seq, worker, outcome, read_cents, after_cents, t_start_ms, t_read_ms, t_end_ms)
         SELECT $1, * FROM unnest($2::smallint[], $3::smallint[], $4::text[], $5::int[], $6::int[], $7::int[], $8::int[], $9::int[])`,
        [
          attack.id,
          events.map((e) => e.seq),
          events.map((e) => e.worker),
          events.map((e) => e.outcome),
          events.map((e) => e.read),
          events.map((e) => e.after),
          events.map((e) => e.t0),
          events.map((e) => e.tRead),
          events.map((e) => e.t1),
        ]
      );
      await sql("UPDATE ds.attacks SET approved = $2, final_cents = $3, extracted_cents = $4, duration_ms = $5 WHERE id = $1", [
        attack.id,
        approved,
        finalBalance,
        loot,
        duration,
      ]);
      await sql(
        `UPDATE ds.level_stats SET attacks = attacks + 1, extracted_cents = extracted_cents + $2, best_cents = GREATEST(best_cents, $2) WHERE level = $1`,
        [level, loot]
      );
      await bump("ds_attacks_total");
      if (level >= 3) {
        await bump("ds_defended_attacks");
        await bump("ds_defended_extracted_cents", loot);
      } else {
        await bump("ds_extracted_cents", loot);
      }

      send("done", {
        attackId: attack.id,
        approved,
        declined: events.filter((e) => e.outcome === "declined").length,
        refused: events.filter((e) => e.outcome === "refused").length,
        finalBalance,
        spent: approved * amount,
        extracted: loot,
        durationMs: duration,
        maxInFlight: maxOverlap(events),
      });
    } catch (err) {
      console.error("[ds/run]", err);
      send("error", { message: "attack failed" });
    } finally {
      close();
    }
  })();

  return response;
}

/** Largest number of requests whose [t0, t1] windows overlapped at one instant. */
function maxOverlap(events: RequestEvent[]): number {
  const pts = events.flatMap((e) => [
    [e.t0, 1],
    [e.t1, -1],
  ]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let max = 0;
  for (const [, d] of pts) {
    cur += d;
    if (cur > max) max = cur;
  }
  return max;
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Salted, truncated hash of the caller IP. Never stores the IP itself. */
export function ipHash(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "local";
  const ip = fwd.split(",")[0].trim();
  const salt = process.env.LAB_IP_SALT ?? "tfpdev-lab";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

/**
 * Visitor sandbox id. The browser generates a UUID once and sends it in a
 * header; the server only checks the shape. Rate limits are per IP, so a
 * forged id gains nothing except someone else's empty sandbox.
 */
export function sessionId(req: Request): string | null {
  const v = req.headers.get("x-lab-session");
  return v && UUID_RE.test(v) ? v.toLowerCase() : null;
}

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds when the current hourly window closes. */
  resetAt: number;
}

/**
 * Fixed hourly window per (ip, bucket), stored in Postgres. One UPSERT per
 * check: no Redis, no in-memory state that a second instance would not see.
 */
export async function rateLimit(req: Request, bucket: string, limit: number): Promise<RateLimitResult> {
  const [row] = await sql<{ count: number; window_start: string }>(
    `INSERT INTO lab.rate_limits (ip_hash, bucket, window_start, count)
     VALUES ($1, $2, date_trunc('hour', now()), 1)
     ON CONFLICT (ip_hash, bucket, window_start)
       DO UPDATE SET count = lab.rate_limits.count + 1
     RETURNING count, extract(epoch FROM window_start)::bigint AS window_start`,
    [ipHash(req), bucket]
  );
  const count = Number(row.count);
  return {
    ok: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: Number(row.window_start) + 3600,
  };
}

/** Same numbers as `rateLimit`, without using one up. */
export async function peekRateLimit(req: Request, bucket: string, limit: number): Promise<RateLimitResult> {
  const [row] = await sql<{ count: number }>(
    "SELECT count FROM lab.rate_limits WHERE ip_hash = $1 AND bucket = $2 AND window_start = date_trunc('hour', now())",
    [ipHash(req), bucket]
  );
  const count = Number(row?.count ?? 0);
  const hour = Math.floor(Date.now() / 3_600_000) * 3600;
  return { ok: count < limit, limit, remaining: Math.max(0, limit - count), resetAt: hour + 3600 };
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(r.resetAt),
  };
}

export function tooMany(r: RateLimitResult) {
  return NextResponse.json(
    { error: "rate_limited", message: `Limit is ${r.limit} per hour per IP. Window resets at ${new Date(r.resetAt * 1000).toISOString()}.` },
    { status: 429, headers: { ...rateLimitHeaders(r), "Retry-After": String(Math.max(1, r.resetAt - Math.floor(Date.now() / 1000))) } }
  );
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: "bad_request", message }, { status });
}

/** Bump one honest counter. Called only after the real thing happened. */
export async function bump(key: string, delta = 1): Promise<void> {
  if (delta === 0) return;
  await sql("UPDATE lab.counters SET value = value + $2 WHERE key = $1", [key, delta]);
}

/**
 * Server-Sent Events over a POST. Returns the Response plus a send/close pair.
 * The client parser lives in lib/lab/stream-client.ts.
 */
export function sseResponse(headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
    },
  });

  function send(event: string, data: unknown) {
    if (closed || !controller) return;
    try {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      closed = true;
    }
  }

  function close() {
    if (closed || !controller) return;
    closed = true;
    try {
      controller.close();
    } catch {
      /* already closed by the client */
    }
  }

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...headers,
    },
  });

  return { response, send, close };
}

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Never prerender: this must hit the database on every request.
export const dynamic = "force-dynamic";

/** GET /api/health/db — round-trip to Neon, applied migrations, server version. */
export async function GET() {
  const started = Date.now();
  try {
    const [[info], migrations] = await Promise.all([
      sql<{ now: string; version: string; branch: string | null }>(
        `SELECT now()::text AS now,
                current_setting('server_version') AS version,
                $1::text AS branch`,
        [process.env.NEON_BRANCH ?? null]
      ),
      sql<{ name: string; applied_at: string }>(
        "SELECT name, applied_at::text FROM public.schema_migrations ORDER BY name"
      ),
    ]);
    return NextResponse.json({
      ok: true,
      latency_ms: Date.now() - started,
      ...info,
      migrations,
    });
  } catch (err) {
    console.error("[health/db]", err);
    return NextResponse.json(
      { ok: false, latency_ms: Date.now() - started, error: "database unreachable" },
      { status: 503 }
    );
  }
}

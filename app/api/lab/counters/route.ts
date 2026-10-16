import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/lab/counters — honest lab-wide counters, incremented only by real runs. */
export async function GET() {
  try {
    const rows = await sql<{ key: string; value: string }>(
      "SELECT key, value::text FROM lab.counters ORDER BY key"
    );
    const counters = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
    return NextResponse.json(counters, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[lab/counters]", err);
    return NextResponse.json({ error: "database unreachable" }, { status: 503 });
  }
}

import { sql } from "@/lib/db";

/** lab.counters as key → value. Empty when the database can't be reached. */
export async function readCounters(): Promise<Record<string, number>> {
  try {
    const rows = await sql<{ key: string; value: string }>("SELECT key, value::text FROM lab.counters");
    return Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  } catch {
    return {};
  }
}

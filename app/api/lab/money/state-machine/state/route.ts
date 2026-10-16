import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { badRequest, sessionId } from "@/lib/lab/request";

export const dynamic = "force-dynamic";

/** GET — both payments for this sandbox and their last transitions. */
export async function GET(req: Request) {
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");

  const payments = await sql(
    "SELECT id, impl, state, amount_cents, refunded_cents, version, updated_at FROM sm.payments WHERE session_id = $1 ORDER BY impl",
    [session]
  );
  const transitions = await sql(
    `SELECT t.id, p.impl, t.action, t.from_state, t.to_state, t.ok, t.reason, t.at
       FROM sm.transitions t JOIN sm.payments p ON p.id = t.payment_id
      WHERE p.session_id = $1 ORDER BY t.id DESC LIMIT 400`,
    [session]
  );
  return NextResponse.json({ payments, transitions }, { headers: { "Cache-Control": "no-store" } });
}

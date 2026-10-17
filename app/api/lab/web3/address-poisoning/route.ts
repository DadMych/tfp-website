import { NextResponse } from "next/server";
import { getLiveDemo } from "@/lib/lab-config";
import { badRequest, ipHash, rateLimit, sessionId, tooMany } from "@/lib/lab/request";
import { newRound, pickRow, poisonState } from "@/lib/web3/poison-game";

export const dynamic = "force-dynamic";

/** GET — this visitor's latest round. Which row is real stays hidden until they pick. */
export async function GET(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  return NextResponse.json(await poisonState(session), { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST { action: "new" } — deal a fresh wallet history.
 * POST { action: "pick", round, row } — copy that row's address; row null = ran out of time.
 */
export async function POST(req: Request) {
  if (!getLiveDemo("web3")) return new Response("not found", { status: 404 });
  const session = sessionId(req);
  if (!session) return badRequest("missing X-Lab-Session");
  const { action, round, row } = (await req.json().catch(() => ({}))) as { action?: string; round?: string; row?: number | null };

  if (action === "new") {
    const rl = await rateLimit(req, "w3_poison", 60);
    if (!rl.ok) return tooMany(rl);
    return NextResponse.json(await newRound(session, ipHash(req)));
  }
  if (action !== "pick") return badRequest("action must be new | pick");
  if (typeof round !== "string") return badRequest("round is required");
  if (row !== null && !(Number.isInteger(row) && row! >= 0 && row! < 8)) return badRequest("row must be 0–7 or null");

  const s = await pickRow(session, round, row ?? null);
  if (s === "gone") return badRequest("that round is over, deal a new one", 409);
  return NextResponse.json(s);
}

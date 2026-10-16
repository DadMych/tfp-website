import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { runSide } from "@/lib/ai/agent";
import { getScenario, type Side } from "@/lib/ai/scenarios";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET → latest eval tally per scenario and side. Public: visitors see the numbers. */
export async function GET() {
  const rows = await sql<{ article: string; scenario: string; side: Side; runs: number; broke: number; at: string }>(
    `SELECT DISTINCT ON (article, scenario, side) article, scenario, side,
            count(*) OVER w::int AS runs, count(*) FILTER (WHERE broke) OVER w::int AS broke, max(created_at) OVER w AS at
       FROM ai.evals
     WINDOW w AS (PARTITION BY article, scenario, side, batch)
      ORDER BY article, scenario, side, created_at DESC`
  );
  return Response.json({ evals: rows }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/lab/ai/eval  { article, scenario, n }   header x-lab-owner
 * Runs the scenario n times on each side against the real model and stores
 * whether it broke. Owner only: it spends the shared budget.
 */
export async function POST(req: Request) {
  if (!isOwner(req)) return new Response("not found", { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { article?: unknown; scenario?: unknown; n?: unknown };
  const scenario = getScenario(body.article, body.scenario);
  if (!scenario) return badRequest("unknown article or scenario");
  const n = Math.min(20, Math.max(1, Number(body.n) || 5));

  const batch = randomUUID();
  const tally: Record<Side, { runs: number; broke: number; stopped: number; clean: number }> = {
    careless: { runs: 0, broke: 0, stopped: 0, clean: 0 },
    guarded: { runs: 0, broke: 0, stopped: 0, clean: 0 },
  };
  const jobs = Array.from({ length: n }, () => ["careless", "guarded"] as Side[]).flat();
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const side = jobs[next++];
      const r = await runSide({ scenario, side, ipHash: null, session: null, emit: () => {}, isEval: true });
      if (r.outcome === "budget") continue;
      tally[side].runs++;
      tally[side][r.outcome]++;
      await sql("INSERT INTO ai.evals (batch, article, scenario, side, run_id, broke) VALUES ($1, $2, $3, $4, $5, $6)", [
        batch,
        scenario.article,
        scenario.id,
        side,
        r.runId,
        r.outcome === "broke",
      ]);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return Response.json({ batch, tally });
}

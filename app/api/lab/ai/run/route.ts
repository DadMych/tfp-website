import { sql } from "@/lib/db";
import { badRequest, ipHash, peekRateLimit, rateLimit, rateLimitHeaders, sessionId, sseResponse, tooMany } from "@/lib/lab/request";
import { aiLimits, liveArticles } from "@/lib/ai-lab";
import { runSide } from "@/lib/ai/agent";
import { budgetLeft } from "@/lib/ai/model";
import { getScenario, type Side } from "@/lib/ai/scenarios";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Below this, a click is served from recordings instead of the model. */
const MIN_LIVE_USD = 0.05;

/**
 * GET ?article=… → this visitor's runs left this hour, today's model budget,
 * and how often each side broke on each scenario over the last 7 days.
 */
export async function GET(req: Request) {
  const article = new URL(req.url).searchParams.get("article") ?? "";
  const [r, b, stats] = await Promise.all([
    peekRateLimit(req, "ai_run", aiLimits.runsPerHour),
    budgetLeft(),
    sql<{ scenario: string; side: Side; runs: number; broke: number }>(
      `SELECT scenario, side, count(*)::int AS runs, count(*) FILTER (WHERE outcome = 'broke')::int AS broke
         FROM ai.runs WHERE article = $1 AND status = 'done' AND replay_of IS NULL AND created_at > now() - interval '7 days'
        GROUP BY 1, 2`,
      [article]
    ),
  ]);
  return Response.json({ limit: r.limit, remaining: r.remaining, resetAt: r.resetAt, budget: b, stats }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/lab/ai/run  { article, scenario }
 * Runs the careless and the guarded agent on the same task at the same time
 * and streams both: `step` events tagged with a side, then `done`.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { article?: unknown; scenario?: unknown };
  const scenario = getScenario(body.article, body.scenario);
  if (!scenario || !liveArticles.some((a) => a.slug === scenario.article)) return badRequest("unknown article or scenario");

  const rl = await rateLimit(req, "ai_run", aiLimits.runsPerHour);
  if (!rl.ok) return tooMany(rl);

  // Visitor CRMs are throwaway; recordings stay a week for replays.
  for (const t of ["contacts", "deals", "notes", "outbox", "audit", "proposals"]) {
    await sql(`DELETE FROM ai.${t} x USING ai.runs r WHERE x.run_id = r.id AND r.created_at < now() - interval '1 day' AND NOT r.eval`);
  }
  await sql("DELETE FROM ai.runs WHERE created_at < now() - interval '7 days' AND NOT eval");

  const budget = await budgetLeft();
  const replay = budget.leftUsd < MIN_LIVE_USD;
  const { response, send, close } = sseResponse(rateLimitHeaders(rl));
  const ip = ipHash(req);
  const session = sessionId(req);

  (async () => {
    try {
      send("start", { remaining: rl.remaining, replay, budget });
      const sides: Side[] = ["careless", "guarded"];
      const results = await Promise.all(
        sides.map((side) =>
          runSide({ scenario, side, ipHash: ip, session, replay, emit: (e) => send("step", { side, ...e }) }).catch((err) => {
            console.error("[ai/run]", side, err);
            send("step", { side, k: "error", message: "The model call failed. Try again in a minute." });
            return null;
          })
        )
      );
      send("done", { sides: results.map((r) => r && { side: r.side, outcome: r.outcome, replay: r.replay }), budget: await budgetLeft() });
    } finally {
      close();
    }
  })();

  return response;
}

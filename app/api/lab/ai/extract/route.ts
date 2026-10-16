import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, rateLimit, rateLimitHeaders, tooMany } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { getLiveDemo } from "@/lib/lab-config";
import { BudgetSpent } from "@/lib/ai/model";
import { BUILDS, FIELDS, KEY, extract, gradeRecord, prove } from "@/lib/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIMIT = 20;

const thread = async (slug: string) => (await sql<{ body: string }>("SELECT body FROM rag.docs WHERE slug = $1", [slug]))[0]?.body ?? null;

/**
 * POST { slug } or { text } → the thread through all three builds, graded against the key when it's one of ours.
 * POST { experiment: true, reps? }   header x-lab-owner → every thread × build, stored as "extract:<build>".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown; text?: unknown; experiment?: unknown; reps?: unknown };
  if (body.experiment === true) return isOwner(req) ? experiment(Math.min(Math.max(Number(body.reps) || 1, 1), 5)) : new Response("not found", { status: 404 });
  if (!getLiveDemo("ai")) return new Response("not found", { status: 404 });

  const slug = typeof body.slug === "string" && KEY[body.slug] ? body.slug : null;
  const text = slug ? await thread(slug) : String(body.text ?? "").trim();
  if (!text) return badRequest("unknown thread");
  if (!slug && (text.length < 40 || text.length > 4000)) return badRequest("Paste an email thread between 40 and 4,000 characters.");

  const rl = await rateLimit(req, "extract", LIMIT);
  if (!rl.ok) return tooMany(rl);
  try {
    const results = await Promise.all(BUILDS.map((b) => extract(b, text)));
    const builds = results.map((x, i) => ({
      build: BUILDS[i],
      record: x.record,
      raw: x.raw,
      error: x.error ?? null,
      grades: slug ? gradeRecord(slug, x.record) : null,
      proofs: x.quotes ? Object.fromEntries(FIELDS.map((f) => [f, prove(f, x.record[f], x.quotes![f], text)])) : null,
      quotes: x.quotes ?? null,
    }));
    return Response.json({ builds, costUsd: results.reduce((s, x) => s + x.costNano, 0) / 1e9, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
  } catch (e) {
    if (e instanceof BudgetSpent) return badRequest("Today's AI budget is spent. It works again tomorrow (UTC).", 503);
    console.error("[extract]", e);
    return badRequest("Something failed on our side. Try again in a moment.", 502);
  }
}

async function experiment(reps: number) {
  const batch = randomUUID();
  const slugs = Object.keys(KEY);
  const texts = new Map(await Promise.all(slugs.map(async (s) => [s, (await thread(s)) ?? ""] as const)));
  const jobs = slugs.flatMap((slug) => BUILDS.flatMap((build) => Array.from({ length: reps }, () => ({ slug, build }))));
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { slug, build } = jobs[next++];
      try {
        const t0 = Date.now();
        const x = await extract(build, texts.get(slug)!);
        const g = gradeRecord(slug, x.record)!;
        const right = FIELDS.filter((f) => g[f] === "right").length;
        await sql(
          `INSERT INTO rag.evals (batch, config, question_id, kind, retrieved, hit, answer, correct, reason, in_tokens, out_tokens, latency_ms)
           VALUES ($1, $2, $3, 'extract', '{}', false, $4, $5, $6, $7, $8, $9)`,
          [batch, `extract:${build}`, slug, JSON.stringify({ record: x.record, quotes: x.quotes ?? null, error: x.error ?? null }), right === FIELDS.length, `${right}/${FIELDS.length}`, x.inputTokens, x.outputTokens, Date.now() - t0]
        );
      } catch (e) {
        if (e instanceof BudgetSpent) return;
        errors.push(`${build} ${slug}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return Response.json({ batch, jobs: jobs.length, errors: errors.slice(0, 20) });
}

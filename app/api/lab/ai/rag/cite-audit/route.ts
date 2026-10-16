import { sql } from "@/lib/db";
import { badRequest } from "@/lib/lab/request";
import { isOwner } from "@/lib/lab/owner";
import { checkCitations } from "@/lib/rag/cite";
import { EVALSET } from "@/lib/rag/evalset";
import { configKey, parseConfigKey, search } from "@/lib/rag/search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/lab/ai/rag/cite-audit  { configs: string[] }   header x-lab-owner
 * Re-runs the search behind each stored answer of the latest answered batch and checks every
 * cited number against the sources. No model calls. `same` says whether the search returned
 * the same documents as when the answer was written.
 */
export async function POST(req: Request) {
  if (!isOwner(req)) return new Response("not found", { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { configs?: unknown };
  const configs = Array.isArray(body.configs) ? body.configs.map((k) => parseConfigKey(String(k))) : [];
  if (!configs.length || configs.some((c) => !c)) return badRequest("unknown config");

  const out = [];
  for (const c of configs) {
    const key = configKey(c!);
    const rows = await sql<{ question_id: string; answer: string; retrieved: string[]; created_at: string }>(
      `WITH b AS (SELECT batch FROM rag.evals WHERE config = $1 AND correct IS NOT NULL ORDER BY created_at DESC LIMIT 1)
       SELECT question_id, answer, retrieved, created_at::text FROM rag.evals WHERE batch = (SELECT batch FROM b) AND config = $1`,
      [key]
    );
    const checked = [];
    for (const r of rows) {
      const q = EVALSET.find((x) => x.id === r.question_id);
      if (!q) continue;
      const s = await search(q.q, c!);
      const sources = s.hits.map((h, i) => ({ n: i + 1, heading: h.heading, text: h.text }));
      checked.push({ id: q.id, same: s.hits.map((h) => h.doc).join() === r.retrieved.join(), claims: checkCitations(r.answer, sources) });
    }
    out.push({ config: key, at: rows[0]?.created_at.slice(0, 10) ?? null, rows: checked });
  }
  return Response.json(out);
}

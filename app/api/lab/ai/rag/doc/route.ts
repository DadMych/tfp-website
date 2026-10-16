import { sql } from "@/lib/db";
import { badRequest, rateLimit, tooMany } from "@/lib/lab/request";
import { getLiveDemo } from "@/lib/lab-config";
import { kindOf } from "@/lib/rag/kinds";

export const dynamic = "force-dynamic";

/** GET ?slug= → one document with its chunks under both strategies. */
export async function GET(req: Request) {
  if (!getLiveDemo("ai")) return new Response("not found", { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return badRequest("bad slug");
  const rl = await rateLimit(req, "rag_doc", 600);
  if (!rl.ok) return tooMany(rl);

  const [[doc], chunks] = await Promise.all([
    sql<{ slug: string; title: string; updated: string; status: string; body: string }>("SELECT slug, title, updated::text, status, body FROM rag.docs WHERE slug = $1", [slug]),
    sql<{ id: string; strategy: "fixed" | "section"; ord: number; heading: string; text: string; tokens: number }>(
      "SELECT id::text, strategy, ord, heading, text, tokens FROM rag.chunks WHERE doc_slug = $1 ORDER BY strategy, ord",
      [slug]
    ),
  ]);
  if (!doc) return new Response("not found", { status: 404 });
  const pick = (s: "fixed" | "section") => chunks.filter((c) => c.strategy === s).map((c) => ({ id: Number(c.id), ord: c.ord, heading: c.heading, text: c.text, tokens: c.tokens }));
  return Response.json(
    { slug: doc.slug, title: doc.title, updated: doc.updated, archived: doc.status === "archived", kind: kindOf(doc.slug), body: doc.body, chunks: { fixed: pick("fixed"), section: pick("section") } },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

// Voyage AI over plain fetch. Imported by scripts/rag-ingest.mjs too: no path aliases.

export const EMBED_MODEL = "voyage-4";
export const RERANK_MODEL = "rerank-3";
export const DIMS = 1024;

async function call<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set");
  const res = await fetch(`https://api.voyageai.com/v1/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`voyage ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

export async function embed(input: string[], inputType: "query" | "document"): Promise<{ vectors: number[][]; tokens: number }> {
  const r = await call<{ data: { embedding: number[]; index: number }[]; usage: { total_tokens: number } }>("embeddings", {
    model: EMBED_MODEL,
    input,
    input_type: inputType,
    output_dimension: DIMS,
  });
  const vectors = r.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  return { vectors, tokens: r.usage.total_tokens };
}

export async function rerank(query: string, documents: string[], topK: number): Promise<{ order: { index: number; score: number }[]; tokens: number }> {
  const r = await call<{ data: { index: number; relevance_score: number }[]; usage: { total_tokens: number } }>("rerank", {
    model: RERANK_MODEL,
    query,
    documents,
    top_k: topK,
  });
  return { order: r.data.map((d) => ({ index: d.index, score: d.relevance_score })), tokens: r.usage.total_tokens };
}

/** pgvector literal. */
export const toVector = (v: number[]) => `[${v.join(",")}]`;

import { answer } from "@/lib/rag/answer";
import { search, type Hit, type PipelineConfig } from "@/lib/rag/search";

// Each lever changes one thing from the baseline, so a difference has one cause.

const CAREFUL: PipelineConfig = { chunks: "section", search: "hybrid", rerank: true, currentOnly: true };

export const LEVERS = ["baseline", "warm", "no-rerank", "rerank-10", "top-3", "keyword"] as const;
export type Lever = (typeof LEVERS)[number];

const SETUP: Record<Lever, { cfg: PipelineConfig; topK: number; cold: boolean; rerankPool?: number }> = {
  baseline: { cfg: CAREFUL, topK: 5, cold: true },
  warm: { cfg: CAREFUL, topK: 5, cold: false },
  "no-rerank": { cfg: { ...CAREFUL, rerank: false }, topK: 5, cold: true },
  "rerank-10": { cfg: CAREFUL, topK: 5, cold: true, rerankPool: 10 },
  "top-3": { cfg: CAREFUL, topK: 3, cold: true },
  keyword: { cfg: { ...CAREFUL, search: "keyword", rerank: false }, topK: 5, cold: true },
};

// List prices in nano-dollars per token (docs.voyageai.com/docs/pricing, 2026-10-16).
// Voyage's free allowance is ignored: this is what the traffic costs once it's used up.
const NANO_PER_EMBED = 60; // voyage-4, $0.06 / M
const NANO_PER_RERANK = 50; // rerank-3, $0.05 / M

export interface Timed {
  /** Milliseconds per stage. keyword runs alongside embed + vector. */
  ms: { embed: number; keyword: number; vector: number; rerank: number; search: number; firstToken: number; answer: number; total: number };
  tokens: { embed: number; rerank: number; input: number; output: number };
  nano: { voyage: number; model: number };
  text: string;
  hits: Hit[];
}

export async function timedAnswer(question: string, lever: Lever): Promise<Timed> {
  const s0 = SETUP[lever];
  const t0 = performance.now();
  const s = await search(question, s0.cfg, null, { topK: s0.topK, cold: s0.cold, rerankPool: s0.rerankPool });
  const a = await answer(question, s.hits, { stream: true });
  const total = Math.round(performance.now() - t0);
  return {
    ms: { ...s.timings, search: s.ms, firstToken: a.firstTokenMs ?? a.ms, answer: a.ms, total },
    tokens: { embed: s.embedTokens, rerank: s.rerankTokens, input: a.inputTokens, output: a.outputTokens },
    nano: { voyage: s.embedTokens * NANO_PER_EMBED + s.rerankTokens * NANO_PER_RERANK, model: a.costNano },
    text: a.text,
    hits: s.hits,
  };
}

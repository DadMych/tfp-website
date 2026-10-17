export const LEVER_LABEL: Record<string, { tech: string; plain: string; what: string; whatPlain: string }> = {
  baseline: {
    tech: "Baseline",
    plain: "The careful setup",
    what: "Hybrid search, rerank every candidate and keep 5, embed every question fresh.",
    whatPlain: "The setup from the RAG chapters: two kinds of search, then a second look picks the best five pieces.",
  },
  warm: {
    tech: "Cached question vector",
    plain: "Remember repeat questions",
    what: "Same as baseline, but a question asked before reuses its stored embedding.",
    whatPlain: "If someone asked the same thing before, skip one step and reuse the earlier lookup.",
  },
  "no-rerank": {
    tech: "No reranker",
    plain: "Skip the second look",
    what: "Hybrid search, top 5 by fused rank. One network call fewer.",
    whatPlain: "Use the search results as they come, without the second look.",
  },
  "rerank-10": {
    tech: "Rerank 10, not all",
    plain: "A shorter list for the second look",
    what: "Baseline, but only the top 10 fused candidates go to the reranker instead of every one.",
    whatPlain: "The second look only re-sorts the ten most promising pieces, not every one the search found.",
  },
  "top-3": {
    tech: "3 sources, not 5",
    plain: "Fewer pieces to read",
    what: "Baseline, but only the top 3 reranked chunks go into the prompt.",
    whatPlain: "Give the AI three pieces to read instead of five.",
  },
  keyword: {
    tech: "Keyword search only",
    plain: "Plain word search",
    what: "Postgres full-text search, top 5. No embedding, no reranker, no Voyage call at all.",
    whatPlain: "Find pieces by matching words, like a basic site search. No extra AI services.",
  },
};

/** The critical path, in order. In hybrid search the keyword query runs alongside embed + vector and is hidden behind them. */
export const STAGES = [
  { key: "embed", tech: "Embed question", plain: "Turn the question into numbers", color: "#B8A4FF" },
  { key: "search", tech: "Database search", plain: "Search the documents", color: "#4ECDC4" },
  { key: "rerank", tech: "Rerank", plain: "Second look", color: "#FFD23F" },
  { key: "firstToken", tech: "Model, first token", plain: "AI starts answering", color: "#FF5CAA" },
  { key: "rest", tech: "Model, rest of answer", plain: "AI finishes", color: "#FFB3D9" },
] as const;

/** Nano-dollars per answer → dollars per 1,000 answers. */
export const per1000 = (nano: number) => `$${((nano * 1000) / 1e9).toFixed(2)}`;

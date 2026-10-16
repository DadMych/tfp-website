// Pipeline presets shared by the page (server) and the demo (client). No server imports.

export type Cfg = { chunks: "fixed" | "section"; search: "keyword" | "vector" | "hybrid"; rerank: boolean; currentOnly: boolean };

/** Same format as configKey in ./search.ts. */
export const cfgKey = (c: Cfg) => `${c.chunks}/${c.search}/${c.rerank ? "rerank" : "norerank"}/${c.currentOnly ? "current" : "all"}`;

export const QUICK: Cfg = { chunks: "fixed", search: "keyword", rerank: false, currentOnly: false };
export const CAREFUL: Cfg = { chunks: "section", search: "hybrid", rerank: true, currentOnly: true };
export const QUICK_KEY = cfgKey(QUICK);
export const CAREFUL_KEY = cfgKey(CAREFUL);

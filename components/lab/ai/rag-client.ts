"use client";

import { labPost, LabRequestError } from "@/lib/lab/client";
import type { KindId } from "@/lib/rag/kinds";
import type { Cfg } from "@/lib/rag/presets";
import { cfgKey } from "@/lib/rag/presets";

/* Shapes returned by /api/lab/ai/rag/* and the one call the workspace and the demos share. */

export interface LibDoc {
  slug: string;
  title: string;
  updated: string;
  archived: boolean;
  kind: KindId;
}
export interface Library {
  words: number;
  chunks: number;
  docs: LibDoc[];
}

export interface Source {
  n: number;
  id: number;
  doc: string;
  title: string;
  kind: KindId;
  updated: string;
  status: string;
  heading: string;
  text: string;
  tokens: number;
  keywordRank: number | null;
  vectorRank: number | null;
  rerankScore: number | null;
}
export interface Candidate {
  id: number;
  doc: string;
  heading: string;
  title: string;
  picked: boolean;
}
export interface AskResult {
  config: string;
  hits: Source[];
  answer: string;
  grade: { kind: string; correct: boolean; reason: string } | null;
  ms: { search: number; answer: number; embed: number; keyword: number; vector: number; rerank: number };
  tokens: { embed: number; rerank: number; input: number; output: number };
  costUsd: number;
  remaining: number;
  trace: { keyword: Candidate[]; vector: Candidate[]; fused: number };
  prompt: { system: string; user: string };
}

export interface FullDoc extends LibDoc {
  body: string;
  chunks: { fixed: { id: number; ord: number; text: string; tokens: number }[]; section: { id: number; ord: number; heading: string; text: string; tokens: number }[] };
}

export async function ask(session: string | null, question: string, cfg: Cfg): Promise<AskResult> {
  return labPost<AskResult>("/api/lab/ai/rag/ask", session, { question, config: cfgKey(cfg) });
}

export const errorText = (e: unknown) => (e instanceof LabRequestError ? e.message : "Network error. Try again.");

const docs = new Map<string, Promise<FullDoc>>();
/** Documents don't change while the page is open: fetch each once. */
export function loadDoc(slug: string): Promise<FullDoc> {
  let p = docs.get(slug);
  if (!p) {
    p = fetch(`/api/lab/ai/rag/doc?slug=${encodeURIComponent(slug)}`).then((r) => {
      if (!r.ok) throw new LabRequestError(r.status, "Couldn't open that document.");
      return r.json() as Promise<FullDoc>;
    });
    p.catch(() => docs.delete(slug));
    docs.set(slug, p);
  }
  return p;
}

/** Splits an answer into text and [n] citation markers. */
export const citeParts = (text: string): ({ n: number } | { text: string })[] =>
  text.split(/(\[\d+\])/).filter(Boolean).map((part) => {
    const m = part.match(/^\[(\d+)\]$/);
    return m ? { n: Number(m[1]) } : { text: part };
  });

export function wrongPlain(reason: string) {
  if (reason === "said it doesn't know") return "Wrong: the answer is in the documents. It didn't find the page.";
  if (reason.startsWith("led with")) return "Wrong: it led with an out-of-date number.";
  if (reason.startsWith("answered")) return "Wrong: that isn't in the documents. It made it up.";
  return "Wrong: the key fact isn't in the answer.";
}

export const section = (heading: string) => heading.split(" › ").slice(1).join(" › ");

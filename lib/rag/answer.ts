import { callModel } from "@/lib/ai/model";
import type { EvalQuestion } from "./evalset";
import type { Hit } from "./search";

export const SYSTEM = `You answer questions from clients of Northwind Studio, a design agency, using only the numbered sources you are given.
Rules:
- Use only facts stated in the sources. Never use outside knowledge and never guess.
- Cite every fact with its source number in square brackets, like [2].
- If a source is marked ARCHIVED, prefer current sources; mention archived facts only as history.
- If the sources do not answer the question, reply with exactly "I don't know based on the Northwind documents." and nothing else.
- Two to four short sentences, plain English, no headings, no lists.`;

export const MAX_TOKENS = 300;

export function sourcesBlock(hits: Hit[]): string {
  return hits.map((h, i) => `[${i + 1}] (${h.doc}${h.heading ? ` · ${h.heading}` : ""})\n${h.text}`).join("\n\n");
}

export const userMessage = (question: string, hits: Hit[]) => `Sources:\n\n${sourcesBlock(hits)}\n\nQuestion: ${question}`;

export interface Answer {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costNano: number;
}

export async function answer(question: string, hits: Hit[]): Promise<Answer> {
  const r = await callModel({
    system: SYSTEM,
    tools: [],
    maxTokens: MAX_TOKENS,
    noThinking: true,
    messages: [{ role: "user", content: userMessage(question, hits) }],
  });
  const text = r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
  return { text, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costNano: r.costNano };
}

const DECLINE = /^I don['’]t know based on the Northwind documents/i;
const word = (w: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "iu");

/** Deterministic grading: required facts present, forbidden facts absent, declines only when it should. */
export function grade(q: EvalQuestion, text: string): { correct: boolean; reason: string } {
  const declined = DECLINE.test(text.trim());
  if (q.kind === "unanswerable") return declined ? { correct: true, reason: "declined" } : { correct: false, reason: "answered a question the documents don't cover" };
  if (declined) return { correct: false, reason: "said it doesn't know" };
  const plain = text.replace(/\[\d+\]/g, "");
  const at = (alt: string) => plain.search(word(alt));
  const firstAt = (f: string | string[]) => Math.min(...(Array.isArray(f) ? f : [f]).map(at).filter((i) => i >= 0));
  const missing = q.facts.find((f) => firstAt(f) === Infinity);
  if (missing) return { correct: false, reason: `missing ${JSON.stringify(missing)}` };
  const firstFact = Math.min(...q.facts.map(firstAt));
  const bad = q.forbid?.find((f) => at(f) >= 0 && at(f) < firstFact);
  if (bad) return { correct: false, reason: `led with ${JSON.stringify(bad)}` };
  return { correct: true, reason: "all facts present" };
}

const WEAK = /^(not|no|yes|one|don't|doesn't|never|kept|closed|нет|не|\d)$/i;

/** Fact groups specific enough to recognise in a chunk ("€5,800" is, "no" isn't). */
export const strongFacts = (q: EvalQuestion) => q.facts.map((f) => (Array.isArray(f) ? f : [f]).filter((a) => !WEAK.test(a))).filter((g) => g.length > 0);

/**
 * Retrieval hit: the retrieved chunks contain the evidence. Facts repeat across many documents,
 * so when a question has specific facts, any chunk holding them counts. Otherwise fall back to
 * the gold documents (all of them, or with `any` at least one).
 */
export function retrievalHit(q: EvalQuestion, hits: Hit[]): boolean {
  const groups = strongFacts(q);
  if (groups.length) {
    const text = hits.map((h) => `${h.heading}\n${h.text}`).join("\n");
    return groups.every((g) => g.some((alt) => word(alt).test(text)));
  }
  const found = (g: string) => hits.some((h) => h.doc === g);
  return q.any ? q.gold.some(found) : q.gold.every(found);
}

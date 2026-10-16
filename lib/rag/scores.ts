import { sql } from "@/lib/db";

export interface ConfigScore {
  config: string;
  questions: number;
  /** Share of answerable questions whose evidence was in the retrieved chunks. */
  retrieval: number;
  /** Share of all questions answered right, or null if this config was only searched. */
  answers: number | null;
  /** Retrieval hits per kind: [hits, answerable]. */
  byKind: Record<string, [number, number]>;
}

/** Latest eval batch per config, from rag.evals. */
export async function latestScores(): Promise<ConfigScore[]> {
  const rows = await sql<{ config: string; kind: string; n: number; answerable: number; hits: number; graded: number; correct: number }>(
    `WITH latest AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals ORDER BY config, created_at DESC),
          answered AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals WHERE correct IS NOT NULL ORDER BY config, created_at DESC)
     SELECT e.config, e.kind, count(*)::int AS n,
            count(*) FILTER (WHERE e.kind <> 'unanswerable')::int AS answerable,
            count(*) FILTER (WHERE e.kind <> 'unanswerable' AND e.hit)::int AS hits,
            count(a.correct)::int AS graded, count(*) FILTER (WHERE a.correct)::int AS correct
       FROM rag.evals e JOIN latest l USING (config, batch)
       LEFT JOIN answered an ON an.config = e.config
       LEFT JOIN rag.evals a ON a.batch = an.batch AND a.config = e.config AND a.question_id = e.question_id
      GROUP BY e.config, e.kind`
  );
  const by = new Map<string, ConfigScore & { hits: number; answerable: number; graded: number; correct: number }>();
  for (const r of rows) {
    const c = by.get(r.config) ?? { config: r.config, questions: 0, retrieval: 0, answers: null, byKind: {}, hits: 0, answerable: 0, graded: 0, correct: 0 };
    c.questions += r.n;
    c.hits += r.hits;
    c.answerable += r.answerable;
    c.graded += r.graded;
    c.correct += r.correct;
    if (r.kind !== "unanswerable") c.byKind[r.kind] = [r.hits, r.answerable];
    by.set(r.config, c);
  }
  return [...by.values()].map(({ hits, answerable, graded, correct, ...c }) => ({
    ...c,
    retrieval: answerable ? hits / answerable : 0,
    answers: graded === c.questions ? correct / graded : null,
  }));
}

export interface GradedAnswer {
  id: string;
  config: string;
  correct: boolean;
  reason: string;
  answer: string;
}

/** Every graded answer of the latest answered batch for each config. */
export async function gradedAnswers(configs: string[]): Promise<GradedAnswer[]> {
  return sql<GradedAnswer>(
    `WITH answered AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals WHERE correct IS NOT NULL AND config = ANY($1) ORDER BY config, created_at DESC)
     SELECT e.question_id AS id, e.config, e.correct, e.reason, left(e.answer, 700) AS answer FROM rag.evals e JOIN answered USING (config, batch)`,
    [configs]
  );
}

export interface Contrast {
  id: string;
  quick: string;
  quickReason: string;
  careful: string;
}

/** Questions the quick build got wrong and the careful build got right, from the latest answered batches. */
export async function contrasts(quick: string, careful: string, ids: string[]): Promise<Contrast[]> {
  const rows = await sql<{ question_id: string; config: string; answer: string; correct: boolean; reason: string }>(
    `WITH answered AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals WHERE correct IS NOT NULL AND config = ANY($1) ORDER BY config, created_at DESC)
     SELECT e.question_id, e.config, e.answer, e.correct, e.reason FROM rag.evals e JOIN answered USING (config, batch) WHERE e.question_id = ANY($2)`,
    [[quick, careful], ids]
  );
  return ids.flatMap((id) => {
    const q = rows.find((r) => r.question_id === id && r.config === quick);
    const c = rows.find((r) => r.question_id === id && r.config === careful);
    return q && c && !q.correct && c.correct ? [{ id, quick: q.answer, quickReason: q.reason, careful: c.answer }] : [];
  });
}

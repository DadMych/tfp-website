import { sql } from "@/lib/db";

export interface PrivRun {
  build: "careless" | "careful";
  id: string;
  /** No cited file the client may not open. */
  clean: boolean;
  reason: string;
  answer: string;
  retrieved: string[];
}

/** Latest batch of The Bot Knows Too Much experiment ("priv:<build>"). */
export async function privRuns(): Promise<PrivRun[]> {
  const rows = await sql<{ config: string; question_id: string; correct: boolean; reason: string; answer: string; retrieved: string[] }>(
    `WITH l AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals WHERE config LIKE 'priv:%' ORDER BY config, created_at DESC)
     SELECT e.config, e.question_id, e.correct, e.reason, left(e.answer, 900) AS answer, e.retrieved FROM rag.evals e JOIN l USING (config, batch) ORDER BY e.question_id, e.id`
  );
  return rows.map((r) => ({ build: r.config.slice("priv:".length) as PrivRun["build"], id: r.question_id, clean: r.correct, reason: r.reason, answer: r.answer, retrieved: r.retrieved }));
}

export interface ForgetRun {
  build: "careless" | "careful";
  step: "before" | "cache" | "index";
  id: string;
  /** No cited file that had been deleted. */
  clean: boolean;
  /** The retrieved pieces included a deleted file. */
  sawDeleted: boolean;
  reason: string;
  answer: string;
}

/** Latest batch of the Deleted, But It Remembers experiment ("forget:<build>:<step>"). */
export async function forgetRuns(): Promise<ForgetRun[]> {
  const rows = await sql<{ config: string; question_id: string; correct: boolean; hit: boolean; reason: string; answer: string }>(
    `WITH l AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals WHERE config LIKE 'forget:%' ORDER BY config, created_at DESC)
     SELECT e.config, e.question_id, e.correct, e.hit, e.reason, left(e.answer, 900) AS answer FROM rag.evals e JOIN l USING (config, batch) ORDER BY e.question_id, e.id`
  );
  return rows.map((r) => {
    const [, build, step] = r.config.split(":");
    return { build: build as ForgetRun["build"], step: step as ForgetRun["step"], id: r.question_id, clean: r.correct, sawDeleted: r.hit, reason: r.reason, answer: r.answer };
  });
}

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

export interface RedactRun {
  build: "careless" | "careful";
  id: string;
  /** No lab patient detail in what was sent, no placeholder left unresolved. */
  clean: boolean;
  /** "<patient>:<field>" for every detail that was sent. */
  sent: string[];
  reason: string;
  /** What the person reading saw. */
  answer: string;
}

/** Latest batch of the What Leaves for the AI experiment for one placeholder rule ("redact:<build>", "redact:<build>:v2"). */
export async function redactRuns(version: "v1" | "v2"): Promise<RedactRun[]> {
  const suffix = version === "v1" ? "" : `:${version}`;
  const rows = await sql<{ config: string; question_id: string; correct: boolean; retrieved: string[]; reason: string; answer: string }>(
    `WITH l AS (SELECT DISTINCT ON (config) config, batch FROM rag.evals WHERE config = ANY($1) ORDER BY config, created_at DESC)
     SELECT e.config, e.question_id, e.correct, e.retrieved, e.reason, left(e.answer, 1500) AS answer FROM rag.evals e JOIN l USING (config, batch) ORDER BY e.question_id, e.id`,
    [[`redact:careless${suffix}`, `redact:careful${suffix}`]]
  );
  return rows.map((r) => ({ build: r.config.split(":")[1] as RedactRun["build"], id: r.question_id, clean: r.correct, sent: r.retrieved, reason: r.reason, answer: r.answer }));
}

import { answer } from "@/lib/rag/answer";
import { BRIEF, message } from "./brief";
import { exposed, redact, rehydrate, type Exposure, type Segment } from "./redact";

export type Build = "careless" | "careful";

export interface Side {
  system: string;
  /** Exactly the user message the model received. */
  sent: string;
  /** What the model wrote. */
  reply: string;
  /** What the person reading sees. */
  shown: Segment[];
  /** Lab patients' real details found in what was sent. */
  exposed: Exposure[];
  swapped: number;
  unresolved: string[];
  inputTokens: number;
  outputTokens: number;
  costNano: number;
}

const SYSTEM = `You help a designer at Northwind Studio, a design agency, with an email from a client. Use only what the email says. Plain English. At most five short sentences, or a short list when asked for one.`;
/** Both are shown on the page. Under v1 the model refused to list the patients: it didn't know the reader gets the real values back. */
export const PLACEHOLDER_RULE = {
  v1: "Some details in the email were replaced with placeholders like [PATIENT_1] or [DOB_2] before it reached you. When you need one, write it exactly as it appears. Never guess what a placeholder stands for.",
  v2: "Before the email reached you, personal details in it were replaced with placeholders like [PATIENT_1] or [DOB_2]. The person reading your answer sees the real values in their place. Use a placeholder exactly as written wherever you would use the detail itself, and don't comment on it. Don't try to work out what it stands for.",
};
export const RULE_VERSION = "v2";

async function side(system: string, sent: string, back: (reply: string) => { segments: Segment[]; unresolved: string[] }, swapped: number): Promise<Side> {
  const a = await answer("", [], { system, user: sent });
  const { segments, unresolved } = back(a.text);
  return { system, sent, reply: a.text, shown: segments, exposed: exposed(system + sent), swapped, unresolved, inputTokens: a.inputTokens, outputTokens: a.outputTokens, costNano: a.costNano };
}

/** Same brief, same task. Careless sends it as it is; careful swaps personal details out first and back in after. */
export async function run(task: string): Promise<Record<Build, Side>> {
  const { parts, swaps } = redact([BRIEF, task]);
  const [careless, careful] = await Promise.all([
    side(SYSTEM, message(BRIEF, task), (t) => ({ segments: [{ t }], unresolved: [] }), 0),
    side(`${SYSTEM}\n${PLACEHOLDER_RULE[RULE_VERSION]}`, message(parts[0], parts[1]), (t) => rehydrate(t, swaps), swaps.length),
  ]);
  return { careless, careful };
}

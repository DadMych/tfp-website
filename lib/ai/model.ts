import { sql } from "@/lib/db";
import { aiLimits } from "@/lib/ai-lab";

// Anthropic Messages API over plain fetch. No SDK: one endpoint, two shapes.

export const MODEL = "claude-haiku-5-5";

// USD per token, prompts under 100k tokens (anthropic.com pricing, 2026-10-16).
// Kept in nano-dollars so a single call is a whole number.
const NANO_PER_INPUT = 100;
const NANO_PER_OUTPUT = 500;
const CAP_NANO = aiLimits.dailyCapUsd * 1e9;

export type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface Message {
  role: "user" | "assistant";
  content: string | Block[];
}

export interface Tool {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
  /** The API guarantees the input matches the schema. */
  strict?: boolean;
}

export interface ModelReply {
  content: Block[];
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
  costNano: number;
}

export class BudgetSpent extends Error {}

/** `noThinking`: Haiku 5.5 thinks by default and thinking tokens count against maxTokens. */
export async function callModel(req: { system: string; tools: Tool[]; messages: Message[]; maxTokens: number; noThinking?: boolean; forceTool?: string }): Promise<ModelReply> {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: req.maxTokens,
    system: req.system,
    ...(req.tools.length ? { tools: req.tools } : {}),
    ...(req.forceTool ? { tool_choice: { type: "tool", name: req.forceTool } } : {}),
    ...(req.noThinking ? { thinking: { type: "disabled" } } : {}),
    messages: req.messages,
  });
  // Worst case before the call: every character a token, every output token used.
  const reserved = body.length * NANO_PER_INPUT + req.maxTokens * NANO_PER_OUTPUT;
  if (!(await reserve(reserved))) throw new BudgetSpent();

  let costNano = 0;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = (await res.json()) as { content: Block[]; stop_reason: string; usage: { input_tokens: number; output_tokens: number } };
    costNano = j.usage.input_tokens * NANO_PER_INPUT + j.usage.output_tokens * NANO_PER_OUTPUT;
    return { content: j.content, stopReason: j.stop_reason, inputTokens: j.usage.input_tokens, outputTokens: j.usage.output_tokens, costNano };
  } finally {
    await sql("UPDATE ai.budget SET spent_nano_usd = LEAST(cap_nano_usd, GREATEST(0, spent_nano_usd + $1)) WHERE day = (now() AT TIME ZONE 'utc')::date", [costNano - reserved]);
  }
}

/** Takes `nano` from today's budget, or returns false. The CHECK on ai.budget is the backstop. */
async function reserve(nano: number): Promise<boolean> {
  await sql("INSERT INTO ai.budget (day, cap_nano_usd) VALUES ((now() AT TIME ZONE 'utc')::date, $1) ON CONFLICT (day) DO NOTHING", [CAP_NANO]);
  const rows = await sql(
    `UPDATE ai.budget SET spent_nano_usd = spent_nano_usd + $1
      WHERE day = (now() AT TIME ZONE 'utc')::date AND spent_nano_usd + $1 <= cap_nano_usd
      RETURNING day`,
    [nano]
  );
  return rows.length === 1;
}

export async function budgetLeft(): Promise<{ capUsd: number; leftUsd: number }> {
  const [row] = await sql<{ cap: string; spent: string }>(
    "SELECT cap_nano_usd::text AS cap, spent_nano_usd::text AS spent FROM ai.budget WHERE day = (now() AT TIME ZONE 'utc')::date"
  );
  const cap = row ? Number(row.cap) : CAP_NANO;
  const spent = row ? Number(row.spent) : 0;
  return { capUsd: cap / 1e9, leftUsd: Math.max(0, cap - spent) / 1e9 };
}

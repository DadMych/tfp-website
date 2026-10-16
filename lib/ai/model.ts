import { sql } from "@/lib/db";
import { aiLimits } from "@/lib/ai-lab";

// Anthropic Messages API over plain fetch. No SDK: one endpoint, two shapes.

export const MODEL = "claude-haiku-5-5";

// USD per token, prompts under 100k tokens (anthropic.com pricing, 2026-10-16).
// Kept in nano-dollars so a single call is a whole number.
const NANO_PER_INPUT = 100;
const NANO_PER_OUTPUT = 500;
// Prompt cache, 5-minute TTL: writes cost 1.25× input, reads 0.1×.
const NANO_PER_CACHE_WRITE = 125;
const NANO_PER_CACHE_READ = 10;
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
  /** Prompt tokens written to / read from the prompt cache. Not included in inputTokens. */
  cacheWrite: number;
  cacheRead: number;
  costNano: number;
  /** Request to last byte. */
  ms: number;
  /** Request to the first text token. Only when streamed. */
  firstTokenMs?: number;
}

type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };

export class BudgetSpent extends Error {}

/**
 * `noThinking`: Haiku 5.5 thinks by default and thinking tokens count against maxTokens.
 * `cache`: automatic prompt caching. Prefixes under 512 tokens are silently not cached.
 * `stream`: text replies only; measures time to the first token.
 */
export async function callModel(req: {
  system: string;
  tools: Tool[];
  messages: Message[];
  maxTokens: number;
  noThinking?: boolean;
  forceTool?: string;
  cache?: boolean;
  stream?: boolean;
}): Promise<ModelReply> {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: req.maxTokens,
    system: req.system,
    ...(req.tools.length ? { tools: req.tools } : {}),
    ...(req.forceTool ? { tool_choice: { type: "tool", name: req.forceTool } } : {}),
    ...(req.noThinking ? { thinking: { type: "disabled" } } : {}),
    ...(req.cache ? { cache_control: { type: "ephemeral" } } : {}),
    ...(req.stream ? { stream: true } : {}),
    messages: req.messages,
  });
  // Worst case before the call: every character a token, every output token used.
  const reserved = body.length * (req.cache ? NANO_PER_CACHE_WRITE : NANO_PER_INPUT) + req.maxTokens * NANO_PER_OUTPUT;
  if (!(await reserve(reserved))) throw new BudgetSpent();

  let costNano = 0;
  try {
    const t0 = performance.now();
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
    const j = req.stream ? await readStream(res, t0) : { ...((await res.json()) as { content: Block[]; stop_reason: string; usage: Usage }), firstTokenMs: undefined };
    const u = j.usage;
    const cacheWrite = u.cache_creation_input_tokens ?? 0;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    costNano = u.input_tokens * NANO_PER_INPUT + cacheWrite * NANO_PER_CACHE_WRITE + cacheRead * NANO_PER_CACHE_READ + u.output_tokens * NANO_PER_OUTPUT;
    return {
      content: j.content,
      stopReason: j.stop_reason,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheWrite,
      cacheRead,
      costNano,
      ms: Math.round(performance.now() - t0),
      firstTokenMs: j.firstTokenMs,
    };
  } finally {
    await sql("UPDATE ai.budget SET spent_nano_usd = LEAST(cap_nano_usd, GREATEST(0, spent_nano_usd + $1)) WHERE day = (now() AT TIME ZONE 'utc')::date", [costNano - reserved]);
  }
}

/** Reads a streamed text reply: message_start carries input usage, message_delta the output count and stop reason. */
async function readStream(res: Response, t0: number): Promise<{ content: Block[]; stop_reason: string; usage: Usage; firstTokenMs?: number }> {
  const usage: Usage = { input_tokens: 0, output_tokens: 0 };
  let text = "";
  let stop = "";
  let firstTokenMs: number | undefined;
  let buf = "";
  const decoder = new TextDecoder();
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const data = buf
        .slice(0, i)
        .split("\n")
        .find((l) => l.startsWith("data: "));
      buf = buf.slice(i + 2);
      if (!data) continue;
      const e = JSON.parse(data.slice(6));
      if (e.type === "message_start") Object.assign(usage, e.message.usage);
      else if (e.type === "content_block_delta" && e.delta.type === "text_delta") {
        firstTokenMs ??= Math.round(performance.now() - t0);
        text += e.delta.text;
      } else if (e.type === "message_delta") {
        stop = e.delta.stop_reason ?? stop;
        usage.output_tokens = e.usage.output_tokens;
      } else if (e.type === "error") throw new Error(`anthropic stream: ${e.error?.message ?? "error"}`);
    }
  }
  return { content: [{ type: "text", text }], stop_reason: stop, usage, firstTokenMs };
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

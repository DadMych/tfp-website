import { callModel } from "@/lib/ai/model";

// Pulling Data Out: a client email thread becomes a CRM record.
// Three builds share the same field descriptions; they differ only in how the answer is shaped and checked.

export const FIELDS = ["client", "contact", "contact_email", "handled_by", "topic", "plan", "price_eur", "last_message_date"] as const;
export type Field = (typeof FIELDS)[number];
export type Value = string | number | null;
export type Rec = Partial<Record<Field, Value>>;

export const TOPICS = ["price", "rush", "cancel", "pause", "downgrade", "unused-hours", "invoice", "access", "files", "scope", "discount", "feedback-rounds", "urgent-line"];
export const PLANS = ["Starter", "Studio", "Partner", "Brand Sprint", "Website Sprint", "Design System Audit"];

export const DESC: Record<Field, string> = {
  client: "The client company's name, as written in the thread. Null if the client's company isn't named.",
  contact: "Full name of the person writing on the client's side. Null if no person is named.",
  contact_email: "That person's email address, if it appears in the thread. Otherwise null.",
  handled_by: "Full name of the Northwind Studio person who replies to the client.",
  topic:
    "What the client is asking about. One of: price (why a price or quote is what it is), rush, cancel, pause, downgrade, unused-hours, invoice (invoices, VAT), access (Figma or tool access), files (keeping, sending or deleting files), scope (what is or isn't included or offered, add-ons), discount, feedback-rounds, urgent-line.",
  plan: "The client's current plan or engagement, if the thread names it: Starter, Studio, Partner, Brand Sprint, Website Sprint or Design System Audit. If they are changing plan, the one they are on now. Null if the thread doesn't name one.",
  price_eur: 'The price in euros, excl. VAT, of what the client is asking about or being quoted, as a number (5800, not "€5,800"). Null if the thread gives no euro price for it.',
  last_message_date: "Date of the last message in the thread, as YYYY-MM-DD.",
};

export const BUILDS = ["prose", "schema", "evidence"] as const;
export type Build = (typeof BUILDS)[number];

const SYSTEM = "You turn a client email thread into a CRM record for Northwind Studio, a design agency. Use only what the thread says.";
const PROSE = `${SYSTEM}\nReply with a JSON object with exactly these keys:\n${FIELDS.map((f) => `- ${f}: ${DESC[f]}`).join("\n")}`;

const nullable = (s: object) => ({ anyOf: [s, { type: "null" }] });
const VALUE: Record<Field, object> = {
  client: nullable({ type: "string" }),
  contact: nullable({ type: "string" }),
  contact_email: nullable({ type: "string" }),
  handled_by: { type: "string" },
  topic: { type: "string", enum: TOPICS },
  plan: nullable({ type: "string", enum: PLANS }),
  price_eur: nullable({ type: "number" }),
  last_message_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
};
const QUOTE = "The exact words from the thread that show this value, copied character for character, at most one sentence. Null only if the value is null.";

function tool(build: Exclude<Build, "prose">) {
  const properties = Object.fromEntries(
    FIELDS.map((f) => [
      f,
      build === "schema"
        ? { ...VALUE[f], description: DESC[f] }
        : { type: "object", description: DESC[f], properties: { value: VALUE[f], quote: nullable({ type: "string", description: QUOTE }) }, required: ["value", "quote"], additionalProperties: false },
    ])
  );
  return { name: "save_record", description: "Save the CRM record for this thread.", strict: true, input_schema: { type: "object" as const, properties, required: [...FIELDS], additionalProperties: false } };
}

export interface Extraction {
  record: Rec;
  /** Evidence build only: the quote given for each field. */
  quotes?: Partial<Record<Field, string | null>>;
  /** What the model sent back, for display. */
  raw: string;
  error?: string;
  inputTokens: number;
  outputTokens: number;
  costNano: number;
}

export async function extract(build: Build, thread: string): Promise<Extraction> {
  const messages = [{ role: "user" as const, content: `Email thread:\n\n${thread}` }];
  if (build === "prose") {
    const r = await callModel({ system: PROSE, tools: [], messages, maxTokens: 600, noThinking: true });
    const raw = r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    let record: Rec = {};
    let error: string | undefined;
    try {
      record = m ? (JSON.parse(m[0]) as Rec) : {};
      if (!m) error = "no JSON in the reply";
    } catch {
      error = "the JSON didn't parse";
    }
    return { record, raw, error, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costNano: r.costNano };
  }
  const t = tool(build);
  const r = await callModel({ system: SYSTEM, tools: [t], forceTool: t.name, messages, maxTokens: build === "evidence" ? 1200 : 600, noThinking: true });
  const input = r.content.find((b) => b.type === "tool_use")?.input ?? {};
  const raw = JSON.stringify(input, null, 1);
  if (build === "schema") return { record: input as Rec, raw, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costNano: r.costNano };
  const pairs = input as Partial<Record<Field, { value?: Value; quote?: string | null }>>;
  const record = Object.fromEntries(FIELDS.map((f) => [f, pairs[f]?.value ?? null])) as Rec;
  const quotes = Object.fromEntries(FIELDS.map((f) => [f, pairs[f]?.quote ?? null])) as Extraction["quotes"];
  return { record, quotes, raw, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costNano: r.costNano };
}

// ── Answer key ──────────────────────────────────────────────────────────────
// Written by hand from each thread. An array lists every value accepted.

type Key = Record<Field, Value | Value[]>;
const k = (client: Value | Value[], contact: Value, email: Value, by: string, topic: string, plan: Value | Value[], price: Value, date: string): Key => ({
  client,
  contact,
  contact_email: email,
  handled_by: by,
  topic,
  plan,
  price_eur: price,
  last_message_date: date,
});
const VB = "Vladislav Boerdonos";
const MR = "Maksim Ryzjikov";
const ST = "Sandra Tsapljoek";

export const KEY: Record<string, Key> = {
  "mail-acme-price": k("Acme Tools", null, null, VB, "price", "Brand Sprint", 9500, "2026-01-22"),
  "mail-atlas-downgrade": k("Atlas HR", "Lena Brandt", "lena.brandt@atlashr.example", ST, "downgrade", "Studio", 2400, "2026-07-22"),
  "mail-atlas-rush": k("Atlas HR", null, null, ST, "rush", "Studio", null, "2026-03-18"),
  "mail-becker-files": k("Becker Freight", null, null, MR, "files", null, null, "2026-08-25"),
  "mail-brightlane-cancel": k("Brightlane", null, null, VB, "cancel", "Studio", null, "2026-05-20"),
  "mail-brightlane-rush-feb": k("Brightlane", null, null, VB, "rush", "Studio", null, "2026-02-26"),
  "mail-halden-delete": k("Halden Health", "Lena Brandt", null, "Sofie Milkova", "files", "Design System Audit", null, "2026-07-30"),
  "mail-halden-fixes": k("Halden Health", null, null, "Michiel Dembitski", "scope", "Design System Audit", null, "2026-04-28"),
  "mail-kestrel-invoice": k("Kestrel Analytics", null, null, MR, "invoice", "Partner", 11200, "2026-02-05"),
  "mail-kestrel-urgent": k("Kestrel Analytics", null, null, ST, "urgent-line", ["Partner", null], null, "2026-07-14"),
  "mail-nonprofit": k("Open Data Collective", null, null, MR, "discount", null, null, "2026-03-30"),
  "mail-ortiz-pause": k("Ortiz Studio", "Marta Ortiz", "marta@ortizstudio.example", VB, "pause", "Starter", null, "2026-06-10"),
  "mail-ortiz-rollover": k("Ortiz Studio", null, null, VB, "unused-hours", "Starter", null, "2026-04-02"),
  "mail-prospect-mobile": k(null, null, null, ST, "scope", null, null, "2026-05-02"),
  "mail-quill-feedback-late": k("Quill Notes", "Priya Nair", null, "Varvara Handoga", "feedback-rounds", "Brand Sprint", 450, "2026-02-24"),
  "mail-quill-naming": k("Quill Notes", null, null, ST, "scope", "Brand Sprint", 2500, "2026-02-03"),
  "mail-tidepool-editor": k("Tidepool Payments", null, null, "Tomás Pereira", "access", "Partner", null, "2026-04-15"),
  "mail-verdant-a11y": k("Verdant Energy", null, null, "Vlas Koerbatski", "scope", "Website Sprint", 1200, "2026-06-04"),
};
// Company names that show up with a team suffix in the From line.
KEY["mail-kestrel-invoice"].client = ["Kestrel Analytics", "Kestrel Analytics finance"];
KEY["mail-brightlane-rush-feb"].client = ["Brightlane", "Brightlane team"];
// "Old fee or new one?" is a question about the rush fee and about a price. Widened after the first run.
KEY["mail-brightlane-rush-feb"].topic = ["rush", "price"];

// ── Grading ─────────────────────────────────────────────────────────────────

/** right: the CRM can take it as is. format: the right answer in a shape an import would reject. */
export type Grade = "right" | "format" | "wrong" | "missing";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const EMPTY = /^(null|none|n\/a|unknown|not (stated|named|given|specified)|-)?$/i;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export function gradeField(f: Field, v: Value | undefined, key: Value | Value[]): Grade {
  const accepts = Array.isArray(key) ? key : [key];
  if (v === undefined) return "missing";
  if (v === null) return accepts.includes(null) ? "right" : "wrong";
  if (typeof v === "string" && EMPTY.test(v.trim())) return accepts.includes(null) ? "format" : "wrong";
  if (f === "price_eur") {
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, "").replace(/\.(?=\d{3}\b)/g, ""));
    if (!accepts.includes(n)) return "wrong";
    return typeof v === "number" ? "right" : "format";
  }
  const s = String(v);
  if (f === "last_message_date") {
    if (accepts.includes(s)) return "right";
    const d = new Date(`${s.replace(/(\d)(st|nd|rd|th)\b/, "$1")} 12:00 UTC`);
    return !isNaN(+d) && accepts.includes(d.toISOString().slice(0, 10)) ? "format" : "wrong";
  }
  const ok = accepts.filter((a): a is string => typeof a === "string").map(norm);
  if (ok.includes(norm(s))) return "right";
  if (f === "topic" || f === "plan") {
    const allowed = (f === "topic" ? TOPICS : PLANS).map(norm);
    if (!allowed.includes(norm(s)) && ok.some((a) => norm(s).includes(a))) return "format";
  }
  return "wrong";
}

export function gradeRecord(slug: string, rec: Rec): Record<Field, Grade> | null {
  const key = KEY[slug];
  if (!key) return null;
  return Object.fromEntries(FIELDS.map((f) => [f, gradeField(f, rec[f], key[f])])) as Record<Field, Grade>;
}

// ── Evidence check ──────────────────────────────────────────────────────────

/** verified: the quote is in the thread and contains the value. Anything else goes to a person. */
export type Proof = "verified" | "null" | "no-quote" | "not-in-thread" | "value-not-in-quote";

const flat = (s: string) =>
  s
    .replace(/\*\*/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

function inQuote(f: Field, v: Value, quote: string): boolean {
  const q = flat(quote);
  if (f === "topic") return true;
  if (f === "price_eur") {
    const n = Number(v);
    const digits = q.replace(/(\d)[.,](?=\d{3}\b)/g, "$1");
    return new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(digits);
  }
  if (f === "last_message_date") {
    const [, m, d] = String(v).split("-").map(Number);
    return q.includes(String(v)) || new RegExp(`\\b${d} ${MONTHS[m - 1]}\\b`).test(q);
  }
  return q.includes(flat(String(v)));
}

export function prove(f: Field, v: Value | undefined, quote: string | null | undefined, thread: string): Proof {
  if (v == null) return "null";
  if (!quote?.trim()) return "no-quote";
  if (!flat(thread).includes(flat(quote))) return "not-in-thread";
  return inQuote(f, v, quote) ? "verified" : "value-not-in-quote";
}

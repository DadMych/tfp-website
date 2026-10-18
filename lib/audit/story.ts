// ─────────────────────────────────────────────────────────────────────────────
// Part 5 — "Launch anyway". The month-after scenario, the rewind, and the
// self-check. Client-safe (no server imports): the interactive page and the
// counters share these. Northwind is fictional; the money figures come from the
// canon invoice amounts (€5,800 Studio, the €0.07 drift) and are labelled a
// scenario, not real losses.
//
// Each bad-month message points at a finding in lib/audit/findings.ts; the
// scenario counters are the sum of the per-message deltas.
// TODO(oleksii): final wording of every message and question.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedMsg {
  day: number;
  from: string;
  role: string;
  text: string;
  /** Bad month only: which finding this message is tappable to. */
  findingId?: string;
  /** Scenario deltas, added to the top-bar counters as the message lands. */
  euros?: number;
  clients?: number;
  lawyers?: number;
}

/** The month after the first launch — the broken cabinet, live. */
export const BAD_MONTH: FeedMsg[] = [
  { day: 1, from: "Vladislav", role: "account lead", text: "Brightlane got charged twice for the same invoice. They're not happy.", findingId: "double-pay", clients: 1 },
  { day: 1, from: "Maksim", role: "finance", text: "Refunding €5,800 to Brightlane. Second time this week someone tapped Pay twice.", findingId: "double-pay", euros: 5800 },
  { day: 3, from: "Sandra", role: "account lead", text: "Kestrel just emailed: they can open Atlas HR's invoices by changing a number in the link??", findingId: "invoice-idor", clients: 1 },
  { day: 5, from: "Maksim", role: "finance", text: "Invoice NW-2026-120 says paid. The bank says nothing arrived — that's €5,800 we never got.", findingId: "webhook-unsigned", euros: 5800 },
  { day: 8, from: "Vlas", role: "web", text: "A client's developer sent a screenshot. Our page code has a key that opens the whole database.", findingId: "db-key", clients: 1 },
  { day: 11, from: "Vladimir", role: "senior lawyer", text: "Tidepool's lawyer called. Our help bot quoted their confidential case study to another client.", findingId: "bot-reads-all", clients: 1, lawyers: 1 },
  { day: 12, from: "Vladislava", role: "PR", text: "A journalist is asking about \u201cthe Tidepool leak\u201d. I'm not answering until we talk.", findingId: "bot-reads-all" },
  { day: 15, from: "Sofie", role: "lawyer", text: "Halden's brief had patient details in it. They went to the AI provider with every question.", findingId: "pii-to-ai", clients: 1, lawyers: 1 },
  { day: 18, from: "Michiel", role: "design systems", text: "The freelancer from March just opened a project file. Their access was removed weeks ago.", findingId: "eternal-links" },
  { day: 21, from: "Vlas", role: "web", text: "Someone tried 40,000 passwords on client logins overnight. Nothing stopped them.", findingId: "no-rate-limits" },
  { day: 26, from: "Maksim", role: "finance", text: "Month-end: the books and the bank are €0.07 apart. Nobody can say where it went.", findingId: "float-cents" },
  { day: 29, from: "Vlas", role: "web", text: "Tried to restore last week's backup after a bad deploy. It doesn't open.", findingId: "untested-restore" },
];

/** The month after the audit — the fixed cabinet. Quiet. */
export const QUIET_MONTH: FeedMsg[] = [
  { day: 1, from: "Vladislav", role: "account lead", text: "Brightlane paid. Once." },
  { day: 7, from: "Vlas", role: "web", text: "Login limits and the backup restore test went in, as planned." },
  { day: 14, from: "Sandra", role: "account lead", text: "Kestrel asked for a new feature. That's the only email this week." },
  { day: 30, from: "Maksim", role: "finance", text: "Month-end: books and bank match to the cent." },
];

export interface ScenarioTotal {
  euros: number;
  clients: number;
  lawyers: number;
}

/** Running total up to and including message index `n` (−1 = nothing shown). */
export function scenarioAt(messages: FeedMsg[], n: number): ScenarioTotal {
  return messages.slice(0, n + 1).reduce<ScenarioTotal>(
    (acc, m) => ({
      euros: acc.euros + (m.euros ?? 0),
      clients: acc.clients + (m.clients ?? 0),
      lawyers: acc.lawyers + (m.lawyers ?? 0),
    }),
    { euros: 0, clients: 0, lawyers: 0 }
  );
}

/** The whole bad month, for the summary card. */
export const BAD_TOTAL = scenarioAt(BAD_MONTH, BAD_MONTH.length - 1);

/** Fixed before launch: the three critical and three high findings (worst first). */
export const REWIND_FIXED = ["db-key", "invoice-idor", "webhook-unsigned", "double-pay", "bot-reads-all", "float-cents"];

export interface SelfQ {
  id: number;
  text: string;
  /** The Northwind finding this maps to. */
  finding: string;
  /** Which answer counts as a likely problem. */
  bad: "no_or_unsure" | "yes";
}

export const SELF_CHECK: SelfQ[] = [
  { id: 1, text: "If a customer taps Pay twice, has anyone checked they're only charged once?", finding: "double-pay", bad: "no_or_unsure" },
  { id: 2, text: "Can a customer see another customer's data by changing a number in a link?", finding: "invoice-idor", bad: "yes" },
  { id: 3, text: "When your payment provider says \u201cpaid\u201d, does your app check the message really came from them?", finding: "webhook-unsigned", bad: "no_or_unsure" },
  { id: 4, text: "Are any secret keys in the code your users' browsers download?", finding: "db-key", bad: "yes" },
  { id: 5, text: "Does your chatbot or AI only read files the person asking is allowed to see?", finding: "bot-reads-all", bad: "no_or_unsure" },
  { id: 6, text: "Is money stored as whole cents, not decimals?", finding: "float-cents", bad: "no_or_unsure" },
  { id: 7, text: "Do you remove personal or medical details before sending text to an AI service?", finding: "pii-to-ai", bad: "no_or_unsure" },
  { id: 8, text: "Do shared file links stop working when someone's access is removed?", finding: "eternal-links", bad: "no_or_unsure" },
  { id: 9, text: "Is there a limit on login attempts?", finding: "no-rate-limits", bad: "no_or_unsure" },
  { id: 10, text: "Has anyone restored a backup in the last 3 months to check it works?", finding: "untested-restore", bad: "no_or_unsure" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Part 5 — "Launch anyway". The month-after scenario that plays out on the
// /lab/audit stage. Client-safe (no server imports). Northwind is fictional;
// the money figures come from the canon invoice amounts (€5,800 Studio, the
// €0.07 drift) and are labelled a scenario, not real losses.
//
// Each message points at a finding in lib/audit/findings.ts; the scenario
// counters are the sum of the per-message deltas.
// TODO(oleksii): final wording of every message.
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

/** Incidents that made the press — the leak the journalist is chasing. */
export const PRESS = BAD_MONTH.filter((m) => /journalist/i.test(m.text)).length;

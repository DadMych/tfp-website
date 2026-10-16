/**
 * Test questions for the Northwind knowledge base.
 * gold: the documents that hold the answer (slug of content/northwind/<slug>.md).
 * facts: every one must appear in a correct answer (an array = any of these words).
 * forbid: an outdated value; wrong if it is mentioned before the correct one (history after it is fine).
 * Unanswerable questions have no gold and must be declined.
 */
export type EvalKind = "exact" | "paraphrase" | "stale" | "multihop" | "table" | "trap" | "buried" | "crosslingual" | "unanswerable";

export interface EvalQuestion {
  id: string;
  q: string;
  kind: EvalKind;
  gold: string[];
  /** Any one gold document is enough (the fact is repeated across documents). Default: all of them. */
  any?: boolean;
  facts: (string | string[])[];
  forbid?: string[];
}

export const EVALSET: EvalQuestion[] = [
  // Exact codes and names: keyword search should shine.
  { id: "e1", kind: "exact", q: "What does NW-SPR-B include?", gold: ["pricing-2026"], facts: ["logo", "brand book"] },
  { id: "e2", kind: "exact", q: "Is fixing things included in NW-AUD-DS?", gold: ["pricing-2026", "proposal-halden", "mail-halden-fixes", "ref-rate-card"], any: true, facts: [["not", "no", "doesn't"]] },
  { id: "e3", kind: "exact", q: "How many page templates are in NW-SPR-W?", gold: ["pricing-2026"], facts: ["8"] },
  { id: "e4", kind: "exact", q: "What format are design tokens delivered in?", gold: ["handoff"], facts: ["W3C"] },
  { id: "e5", kind: "exact", q: "Which WCAG level do your designs target?", gold: ["accessibility"], facts: ["2.2", "AA"] },

  // Paraphrase: no shared keywords, vector search should shine.
  { id: "p1", kind: "paraphrase", q: "If we don't use all our hours, can we get the money back?", gold: ["contract-terms"], facts: [["not", "never", "no"], ["refund", "refunded", "paid out"]] },
  { id: "p2", kind: "paraphrase", q: "We'd like to take a break for the summer. Is that possible?", gold: ["faq"], facts: ["two months"] },
  { id: "p3", kind: "paraphrase", q: "Can your people write the frontend for us?", gold: ["services", "ref-partners", "sales-objections", "podcast-oleksij"], any: true, facts: [["not", "don't", "no"], "code"] },
  { id: "p4", kind: "paraphrase", q: "How long do you hang on to our files once we stop working together?", gold: ["security-privacy"], facts: ["24 months"] },
  { id: "p5", kind: "paraphrase", q: "Our designer is great, could we bring her in-house?", gold: ["faq"], facts: ["12 months"] },
  { id: "p6", kind: "paraphrase", q: "What happens if we just never reply to your drafts?", gold: ["revisions"], facts: ["10 working days", "accepted"] },
  { id: "p7", kind: "paraphrase", q: "Will you feed our confidential brief into ChatGPT?", gold: ["security-privacy", "hb-ai-policy", "slack-ai-question"], any: true, facts: [["don't", "do not", "won't", "will not", "never", "no"]] },
  { id: "p8", kind: "paraphrase", q: "Who will I actually talk to day to day?", gold: ["services"], facts: ["account lead"] },

  // Stale: the 2025 price list is still in the knowledge base.
  { id: "s1", kind: "stale", q: "How much is the Studio retainer per month?", gold: ["pricing-2026"], facts: ["5,800"], forbid: ["5,200"] },
  { id: "s2", kind: "stale", q: "What does a Brand Sprint cost?", gold: ["pricing-2026"], facts: [["9,500", "9.500"]], forbid: ["8,500"] },
  { id: "s3", kind: "stale", q: "What's the discount if we pay the retainer for a year up front?", gold: ["pricing-2026"], facts: ["10%"], forbid: ["15%"] },
  { id: "s4", kind: "stale", q: "What is the rush fee?", gold: ["rush-and-scheduling"], facts: ["40%"], forbid: ["25%"] },

  // Multi-hop: the answer needs two documents.
  { id: "m1", kind: "multihop", q: "On a Brand Sprint, what does a third revision round cost if it's rushed?", gold: ["revisions", "rush-and-scheduling"], facts: ["450", "40%"] },
  { id: "m2", kind: "multihop", q: "We're a registered non-profit and want to pay annually. What discount do we get?", gold: ["faq", "pricing-2026"], facts: ["15%"], forbid: ["25%"] },
  { id: "m3", kind: "multihop", q: "We're on Starter and something blocks our launch. Can we call the urgent line?", gold: ["support-sla"], facts: ["Partner"] },
  { id: "m4", kind: "multihop", q: "How many hours does a 10-hour rush request use on our retainer?", gold: ["rush-and-scheduling"], facts: ["14"] },
  { id: "m5", kind: "multihop", q: "If we cancel an annual retainer, what happens to the months we haven't used?", gold: ["contract-terms"], facts: [["refund", "refunded"], "discount"] },

  // Tables: the answer sits in one row of a table.
  { id: "t1", kind: "table", q: "How fast do you reply on the Studio plan?", gold: ["support-sla"], facts: ["same working day"] },
  { id: "t2", kind: "table", q: "How many design hours are in the Partner plan?", gold: ["pricing-2026"], facts: ["130"] },
  { id: "t3", kind: "table", q: "How many requests can Starter have open at once?", gold: ["pricing-2026", "ref-rate-card", "ref-deliverables-matrix"], any: true, facts: [["1", "one"]] },
  { id: "t4", kind: "table", q: "Does the Studio plan include a monthly review call?", gold: ["support-sla", "ref-deliverables-matrix", "pricing-2026"], any: true, facts: [["no", "not", "doesn't", "don't"]] },

  // More stale facts: older documents still in the knowledge base.
  { id: "s5", kind: "stale", q: "How much is the naming add-on?", gold: ["faq"], any: true, facts: ["2,500"], forbid: ["2,000"] },
  { id: "s6", kind: "stale", q: "How long can we pause a retainer for?", gold: ["faq", "mail-ortiz-pause", "nl-opzeggen", "es-preguntas"], any: true, facts: ["two months"] },
  { id: "s7", kind: "stale", q: "What's the non-profit discount?", gold: ["faq", "mail-nonprofit", "es-preguntas"], any: true, facts: ["15%"] },
  { id: "s8", kind: "stale", q: "What's the rush fee for a rush we confirm today?", gold: ["rush-and-scheduling", "nl-spoedwerk", "mail-atlas-rush"], any: true, facts: ["40%"], forbid: ["currently 25%"] },

  // Traps: a document says something true that is not the rule.
  { id: "x1", kind: "trap", q: "Can unused retainer hours roll over for two months?", gold: ["contract-terms", "mail-ortiz-rollover", "slack-kestrel-exception"], any: true, facts: [["one month", "next month only", "the next month"]] },
  { id: "x2", kind: "trap", q: "Is the urgent line available on the Studio plan?", gold: ["support-sla", "nl-ondersteuning", "ref-deliverables-matrix"], any: true, facts: ["Partner"] },
  { id: "x3", kind: "trap", q: "Do you have an office in Amsterdam?", gold: ["services", "hb-welcome", "ref-partners"], any: true, facts: ["Rotterdam"] },
  { id: "x4", kind: "trap", q: "Was the Studio plan going to cost €6,200 in 2026?", gold: ["draft-pricing-2026-proposal", "mtg-2025-11-pricing"], any: true, facts: [["rejected", "not adopted", "never adopted"], "5,800"] },
  { id: "x5", kind: "trap", q: "A rush was confirmed in writing on 25 February 2026 and delivered in March. Which rush fee applies?", gold: ["mail-brightlane-rush-feb"], facts: ["25%"] },

  // Buried: the fact lives only in notes, threads, reports, transcripts or the contract.
  { id: "b1", kind: "buried", q: "Who is the account lead for Kestrel Analytics?", gold: ["case-kestrel", "ref-team-directory", "mtg-2026-03-kestrel"], any: true, facts: ["Sandra"] },
  { id: "b2", kind: "buried", q: "Why is there no Dutch VAT on Kestrel's invoice?", gold: ["mail-kestrel-invoice"], facts: ["Ireland", "reverse charge"] },
  { id: "b3", kind: "buried", q: "How long was Harbor down in April 2026?", gold: ["postmortem-harbor-2026-04", "mtg-2026-04-incident"], any: true, facts: ["3 hours 20 minutes"] },
  { id: "b4", kind: "buried", q: "How many clients were affected by the Harbor upload outage?", gold: ["postmortem-harbor-2026-04"], facts: [["23", "twenty-three"]] },
  { id: "b5", kind: "buried", q: "Who can build the mobile app if you only do the design?", gold: ["ref-partners", "mail-prospect-mobile", "sales-call-transcript"], any: true, facts: ["Byteharbour"] },
  { id: "b6", kind: "buried", q: "What do we get for referring another company?", gold: ["help-referrals", "mtg-2026-05-ops"], any: true, facts: ["8"] },
  { id: "b7", kind: "buried", q: "How much would the Partner plan cost per year if paid in advance?", gold: ["proposal-tidepool"], facts: ["120,960"] },
  { id: "b8", kind: "buried", q: "How many hours did Kestrel use in May 2026?", gold: ["status-kestrel-2026-05"], facts: ["121"] },
  { id: "b9", kind: "buried", q: "Which breakpoints did you design the Becker Freight website for?", gold: ["handoff-notes-becker"], facts: ["360", "768", "1280"] },
  { id: "b10", kind: "buried", q: "How satisfied were clients in your 2025 survey?", gold: ["survey-2025"], facts: ["4.6"] },
  { id: "b11", kind: "buried", q: "What is your liability capped at?", gold: ["legal-msa"], facts: ["12 months"] },
  { id: "b12", kind: "buried", q: "Which law governs our contract?", gold: ["legal-msa"], facts: ["Dutch law"] },
  { id: "b13", kind: "buried", q: "How quickly will you tell us about a data breach?", gold: ["legal-dpa"], facts: ["48 hours"] },
  { id: "b14", kind: "buried", q: "We sent our feedback 12 working days after your draft. Does that count as a new round?", gold: ["mail-quill-feedback-late", "revisions"], any: true, facts: [["new round", "yes"]] },
  { id: "b15", kind: "buried", q: "Is the studio open on 14 May 2026?", gold: ["ref-holidays-2026"], facts: [["closed", "no"]] },
  { id: "b16", kind: "buried", q: "What contrast ratio do you require for body text?", gold: ["hb-accessibility-checks"], facts: ["4.5:1"] },
  { id: "b17", kind: "buried", q: "How many components does the Kestrel design system have?", gold: ["case-kestrel", "talk-tokens-transcript"], any: true, facts: ["140"] },
  { id: "b18", kind: "buried", q: "Did Quill Notes change its name after the naming work?", gold: ["case-quill"], facts: [["kept", "no"]] },
  { id: "b19", kind: "buried", q: "What happened to Becker Freight's quote requests after the new website?", gold: ["case-becker"], facts: ["31%"] },

  // Cross-lingual: the question is not in English.
  { id: "l1", kind: "crosslingual", q: "Hoeveel kost spoedwerk?", gold: ["rush-and-scheduling", "nl-spoedwerk"], any: true, facts: ["40"] },
  { id: "l2", kind: "crosslingual", q: "Wie viel kostet der Studio-Plan pro Monat?", gold: ["pricing-2026", "de-leistungen", "ref-rate-card"], any: true, facts: [["5,800", "5.800", "5800"]], forbid: ["5,200", "5.200"] },
  { id: "l3", kind: "crosslingual", q: "¿Cuánto tiempo guardan nuestros archivos después del proyecto?", gold: ["security-privacy", "de-datenschutz", "mail-becker-files"], any: true, facts: ["24"] },
  { id: "l4", kind: "crosslingual", q: "Сколько стоит Brand Sprint?", gold: ["pricing-2026", "ref-rate-card"], any: true, facts: [["9,500", "9.500", "9 500", "9500"]], forbid: ["8,500", "8 500"] },
  { id: "l5", kind: "crosslingual", q: "Можно ли вернуть деньги за неиспользованные часы?", gold: ["contract-terms", "help-cancelling", "legal-msa", "nl-opzeggen", "es-preguntas"], any: true, facts: [["not", "no", "never", "нет", "не"]] },

  // Unanswerable: nothing in the knowledge base. The right answer is "I don't know".
  { id: "u1", kind: "unanswerable", q: "What is the studio director's phone number?", gold: [], facts: [] },
  { id: "u2", kind: "unanswerable", q: "Which accounting software do you use?", gold: [], facts: [] },
  { id: "u3", kind: "unanswerable", q: "Do you offer a free trial month?", gold: [], facts: [] },
  { id: "u4", kind: "unanswerable", q: "Can we pay by credit card?", gold: [], facts: [] },
  { id: "u5", kind: "unanswerable", q: "What is Northwind's annual revenue?", gold: [], facts: [] },
  { id: "u6", kind: "unanswerable", q: "How much does Byteharbour charge for an app?", gold: [], facts: [] },
];

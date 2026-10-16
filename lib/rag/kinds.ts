// What kind of document a Northwind slug is, and what kind of question an eval is. Shared by the server and the page.

import type { EvalKind } from "./evalset";

export const KINDS = [
  { id: "help", label: "Help centre", plain: "Help pages" },
  { id: "handbook", label: "Internal handbook", plain: "Staff handbook" },
  { id: "meeting", label: "Meeting notes", plain: "Meeting notes" },
  { id: "email", label: "Client emails", plain: "Emails with clients" },
  { id: "chat", label: "Slack exports", plain: "Team chat" },
  { id: "case", label: "Case studies", plain: "Case studies" },
  { id: "sales", label: "Proposals and sales", plain: "Proposals" },
  { id: "report", label: "Reports and briefs", plain: "Reports" },
  { id: "legal", label: "Contracts", plain: "Contracts" },
  { id: "reference", label: "Price lists and tables", plain: "Price lists and tables" },
  { id: "transcript", label: "Call and talk transcripts", plain: "Call transcripts" },
  { id: "blog", label: "Blog and jobs", plain: "Blog posts and job ads" },
  { id: "foreign", label: "NL · DE · ES", plain: "Other languages" },
] as const;

export type KindId = (typeof KINDS)[number]["id"];

const BY_PREFIX: [RegExp, KindId][] = [
  [/^(nl|de|es)-/, "foreign"],
  [/^help-|^(services|faq|onboarding|accessibility|handoff|revisions|rush-and-scheduling|support-sla|security-privacy|contract-terms)$|^faq-/, "help"],
  [/^hb-|^sales-objections$/, "handbook"],
  [/^mtg-/, "meeting"],
  [/^mail-/, "email"],
  [/^slack-/, "chat"],
  [/^case-/, "case"],
  [/^proposal-|^pitch-/, "sales"],
  [/^(status|brief|survey|okr|handoff-notes|postmortem|harbor-changelog)/, "report"],
  [/^legal-/, "legal"],
  [/^(ref-|pricing-|old-|draft-)/, "reference"],
  [/transcript|^podcast-/, "transcript"],
  [/^(blog|job)-/, "blog"],
];

export function kindOf(slug: string): KindId {
  return BY_PREFIX.find(([re]) => re.test(slug))?.[1] ?? "help";
}

export const kindLabel = (id: KindId, plain: boolean) => {
  const k = KINDS.find((x) => x.id === id)!;
  return plain ? k.plain : k.label;
};

/** Eval question kinds: [technical, plain]. */
export const QUESTION_KINDS: Record<EvalKind, [string, string]> = {
  exact: ["Exact codes", "Product codes"],
  paraphrase: ["Paraphrase", "In other words"],
  stale: ["Changed prices", "Old prices"],
  multihop: ["Multi-hop", "Two facts at once"],
  table: ["Tables", "From a table"],
  trap: ["Traps", "Trick questions"],
  buried: ["Buried", "Only in one email or note"],
  crosslingual: ["Cross-lingual", "Other languages"],
  unanswerable: ["Not covered", "Not in the files"],
};

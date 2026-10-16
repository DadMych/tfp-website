// ─────────────────────────────────────────────────────────────────────────────
// /lab — live demos. Only demos with status "live" exist publicly:
// nav, sitemap, index and the route itself. Everything else is a 404.
// ─────────────────────────────────────────────────────────────────────────────

export type DemoStatus = "live" | "draft";

export interface LabDemo {
  slug: string;
  title: string;
  /** The problem the demo proves a solution to. One line. */
  proves: string;
  stack: string[];
  status: DemoStatus;
}

export const labDemos: LabDemo[] = [
  {
    slug: "money",
    title: "Money Lab",
    proves:
      "The ways payment systems lose money, reproduced live against Postgres. Race a balance, replay a webhook, refund twice. Then see the version that holds.",
    stack: ["Next.js", "PostgreSQL", "Neon"],
    status: "live",
  },
  {
    slug: "ai",
    title: "AI Lab",
    proves:
      "A made-up company, three years of its files, and a support bot that answers from them. Open the files, ask the bot, see every step it took. Then take it apart one piece at a time.",
    stack: ["Next.js", "PostgreSQL", "pgvector", "Claude"],
    status: "live",
  },
];

/** Local preview of drafts. Never set on Vercel. */
export const showDrafts = process.env.LAB_SHOW_DRAFTS === "1";

export const liveDemos = labDemos.filter((d) => d.status === "live" || showDrafts);
export const labEnabled = liveDemos.length > 0;

export function getLiveDemo(slug: string): LabDemo | undefined {
  return liveDemos.find((d) => d.slug === slug);
}

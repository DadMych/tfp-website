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
    slug: "safe-agent",
    title: "Safe Agent",
    proves:
      "An agent over a small CRM. Read tools run freely. Write tools propose a change and nothing saves without a click. Permissions, audit log, eval page.",
    stack: ["Next.js", "TypeScript", "PostgreSQL"],
    status: "draft",
  },
];

export const liveDemos = labDemos.filter((d) => d.status === "live");
export const labEnabled = liveDemos.length > 0;

export function getLiveDemo(slug: string): LabDemo | undefined {
  return liveDemos.find((d) => d.slug === slug);
}

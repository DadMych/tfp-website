// ─────────────────────────────────────────────────────────────────────────────
// /lab — live demos. Only demos with status "live" exist publicly:
// nav, sitemap, index and the route itself. Everything else is a 404.
// ─────────────────────────────────────────────────────────────────────────────

export type DemoStatus = "live" | "draft";

export interface LabDemo {
  slug: string;
  /** Each lab is one Part of the Northwind story. */
  part: number;
  title: string;
  /** The problem the demo proves a solution to. One short paragraph. */
  proves: string;
  stack: string[];
  /** Where the Part starts, and the button that goes there. */
  href: string;
  cta: string;
  color: string;
  status: DemoStatus;
}

export const labDemos: LabDemo[] = [
  {
    slug: "money",
    part: 2,
    title: "Northwind gets paid.",
    proves:
      "The studio bills its clients through its portal, Harbor. Six ways that money goes missing, running live against Postgres. Attack a balance, replay a webhook, refund twice, then flip to the version that holds.",
    stack: ["Next.js", "PostgreSQL", "Neon"],
    // TODO(oleksii): articles or games?
    href: "/lab/money/articles",
    cta: "Break it",
    color: "#FFE600",
    status: "live",
  },
  {
    slug: "ai",
    part: 1,
    title: "Northwind gets an AI.",
    proves: "A support bot that answers clients from the studio's files. Ask it, check its homework, then take it apart one piece at a time.",
    stack: ["Next.js", "PostgreSQL", "pgvector", "Claude"],
    href: "/lab/ai",
    cta: "Ask the bot",
    color: "#FF5CAA",
    status: "live",
  },
  {
    slug: "web3",
    part: 3,
    title: "Northwind gets paid in crypto.",
    proves: "Clients pay in USDC on a real test network. Seven ways the books go wrong: a payment that vanishes, lands on the wrong invoice, comes in fake, goes out twice or never gets reported. Then the version that checks.",
    stack: ["Next.js", "PostgreSQL", "viem", "Solidity", "Sepolia"],
    href: "/lab/web3/confirmations",
    cta: "Send a payment",
    color: "#B79CFF",
    status: "live",
  },
];

// TODO(oleksii): final wording.
export const labHero =
  "Northwind Studio: a design agency in Rotterdam, 16 people, three years of files that don't all agree. Then I gave it an AI and a way to get paid, and broke both. Each part is live: break it, then see the version that holds.";

/** "Part 1 · Northwind gets an AI" */
export function partLabel(d: LabDemo) {
  return `Part ${d.part} · ${d.title.replace(/\.$/, "")}`;
}

/** Local preview of drafts. Never set on Vercel. */
export const showDrafts = process.env.LAB_SHOW_DRAFTS === "1";

export const liveDemos = labDemos.filter((d) => d.status === "live" || showDrafts);
export const labEnabled = liveDemos.length > 0;

export function getLiveDemo(slug: string): LabDemo | undefined {
  return liveDemos.find((d) => d.slug === slug);
}

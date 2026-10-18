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
  /** The Part's hub intro: a short story, one paragraph per entry. TODO(oleksii): wording. */
  story: { tech: string; plain?: string }[];
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
    story: [
      { tech: "Then Harbor, the studio's client portal, starts taking invoice payments. Every way that money can go missing gets a chapter here." },
      {
        tech: "Six chapters, all live on a real Postgres database: a hundred payments against one balance, one payment tapped twenty times, a refund that goes out twice, books that stop adding up. Each time you break it first, then switch on the version that holds.",
        plain:
          "Six chapters, all running on a real database: a hundred payments against one balance, one payment tapped twenty times, a refund that goes out twice, books that stop adding up. Each time you break it first, then switch on the version that holds.",
      },
      { tech: "You press the buttons. The numbers in the black box are what visitors have done to it so far." },
    ],
    stack: ["Next.js", "PostgreSQL", "Neon"],
    href: "/lab/money",
    cta: "Break it",
    color: "#FFE600",
    status: "live",
  },
  {
    slug: "ai",
    part: 1,
    title: "Northwind gets an AI.",
    proves: "A support bot that answers clients from the studio's files. Ask it, check its homework, then take it apart one piece at a time.",
    story: [
      { tech: "Northwind's clients keep asking the same things: what the Studio plan costs, how much a rush adds, who handles their contract. The answers are somewhere in 140 files, and the files don't all agree." },
      {
        tech: "So I gave the studio a support bot that answers from those files. Five chapters take it apart, one piece at a time. Four give it real jobs: client emails to file, a CRM to clean up, a bill to cut.",
        plain: "So I gave the studio a support bot that answers from those files. Five chapters take it apart, one piece at a time. Four give it real jobs: sorting client emails, tidying the customer list, cutting what it costs.",
      },
      {
        tech: "The numbers in the black box come from my test set: the same 65 questions, asked of a quick build and a careful one.",
        plain: "The numbers in the black box come from my test: 65 questions with known answers, asked of a quick version and a careful one.",
      },
    ],
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
    story: [
      { tech: "Then a new client asks to pay in USDC, a digital dollar. The studio says yes, and starts paying its freelancers the same way." },
      { tech: "Seven chapters, seven ways the books go wrong: a payment that vanishes, lands on the wrong invoice, comes in fake, goes out twice or never gets reported. Each time, a careless version and a careful one face the same payments." },
      {
        tech: "In six of the seven chapters, a button sends a real USDC transfer on Sepolia, Ethereum's test network, with a public receipt on Etherscan. Test money is worth nothing, so nobody loses anything.",
        plain: "In six of the seven chapters, a button sends a real payment on a public test network, with a receipt anyone can open. Test money is worth nothing, so nobody loses anything.",
      },
    ],
    stack: ["Next.js", "PostgreSQL", "viem", "Solidity", "Sepolia"],
    href: "/lab/web3",
    cta: "Send a payment",
    color: "#B79CFF",
    status: "live",
  },
];

// TODO(oleksii): final wording.
export const labHero =
  "Northwind Studio: a design agency in Rotterdam, 16 people, three years of files that don't all agree. Then I gave it an AI, a way to get paid and a crypto wallet, and broke all three. Each part is live: break it, then see the version that holds.";

/** Local preview of drafts. Never set on Vercel. */
export const showDrafts = process.env.LAB_SHOW_DRAFTS === "1";

export const liveDemos = labDemos.filter((d) => d.status === "live" || showDrafts);
export const labEnabled = liveDemos.length > 0;

export function getLiveDemo(slug: string): LabDemo | undefined {
  return liveDemos.find((d) => d.slug === slug);
}

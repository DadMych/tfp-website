// ─────────────────────────────────────────────────────────────────────────────
// All site content lives here. Edit copy without touching components.
// ─────────────────────────────────────────────────────────────────────────────

import { offer as review } from "@/lib/review";
import { liveDemos } from "@/lib/lab-config";

export const siteConfig = {
  name: "tfpdev",
  email: "oleksii@tfpdev.com",
  linkedinUrl: "https://www.linkedin.com/in/oleksii-kuropatkin1/?locale=uk",
  calendlyUrl: "https://calendly.com/oleksii-tfpdev/30min",
  /** Length of the free call. Must match the Calendly event above. TODO(oleksii): 15 or 30. */
  callMinutes: 30,
  availability: {
    nav: "1 slot · Q4 2026 / Q1 2027",
    footerBadge: "1 slot · Q4 2026 / Q1 2027",
    footerLine:
      "One client slot for Q4 2026 / Q1 2027. Consulting, audits & rescue work — usually room.",
  },
};

export const clientQuote = {
  text: "Because you ship. When you say it'll be done Friday — it's done Friday. You don't disappear. You don't show up with excuses. You just do the work.",
  context:
    "My longest-running client — big business, can afford whoever he wants. I asked him once, half-joking, why he's still paying me when he has smarter engineers in his network.",
  attribution: "CEO · US events organization",
};

// TODO(oleksii): confirm wording.
export const aboutLine =
  "I started at 14. Eight years later I still like the part most people skip: finding where it breaks.";

// ── Hero ─────────────────────────────────────────────────────────────────────

// TODO(oleksii): pick the headline.
//   A (shown): "Most developers show you what they built. I show you how it breaks."
//   B: "Payments, AI and data that hold up when real users show up."
//   C: "I built a company to break it."
export const hero = {
  eyebrow: "Solution Architect · I build it too",
  lead: "Most developers show you what they built.",
  punch: "I show you",
  mark: "how it breaks.",
  sub: "I design and build the parts of a product where one mistake costs money or trust: AI that answers from your data, payments, crypto, who sees what. From a first MVP, or from a half-finished app someone else started.",
};

// ── Offers ───────────────────────────────────────────────────────────────────

export interface Offer {
  id: string;
  name: string;
  terms: string;
  forWho: string;
  youGet: string;
  proof: { label: string; href: string };
  accentHex: string;
}

const confirmed = (s: string) => s.replace(/^TODO\(oleksii\):\s*/, "");
const auditPart = liveDemos.find((d) => d.part === 5);

export const offers: Offer[] = [
  {
    id: "audit",
    name: "Audit",
    // TODO(oleksii): price and duration. Same values as lib/review.ts.
    terms: `Fixed price · ${confirmed(review.duration)}`,
    forWho: "An app that exists, often built fast or with AI tools, and you're not sure it holds.",
    youGet: "A written report, findings ranked by what they'd cost you, and what I'd fix first.",
    proof: { label: "What an audit finds", href: auditPart?.href ?? "/lab" },
    accentHex: "#FF6B6B",
  },
  {
    id: "build",
    name: "Build",
    terms: "MVP from zero, or finish what's half-built",
    forWho: "Founders who need a working first version, or a product stuck at 80%.",
    youGet: "Architecture written down first, weekly working releases, the repo in your name from day one.",
    proof: { label: "How I build payments", href: "/lab/money" },
    accentHex: "#FFE600",
  },
  {
    id: "stay",
    name: "Stay on",
    terms: "Monthly",
    forWho: "After launch, when you need one person who owns the system.",
    youGet: "I keep it running, review what others ship, and tell you early what will break.",
    proof: { label: "Audit, then rebuilt", href: "/work/ticketing-rescue" },
    accentHex: "#4ECDC4",
  },
];

// ── Tech Stack ────────────────────────────────────────────────────────────────

export const techStack = {
  row1: [
    "Python",
    "TypeScript",
    "JavaScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "MySQL",
    "Python",
    "TypeScript",
    "JavaScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "MySQL",
  ],
  row2: [
    "Docker",
    "AWS",
    "Linux",
    "Stripe",
    "Telegram API",
    "CI/CD",
    "Nginx",
    "Redis",
    "Docker",
    "AWS",
    "Linux",
    "Stripe",
    "Telegram API",
    "CI/CD",
    "Nginx",
    "Redis",
  ],
};

// ── How It Works ──────────────────────────────────────────────────────────────

export interface Step {
  number: string;
  title: string;
  description: string;
  accentHex: string;
}

export const steps: Step[] = [
  {
    number: "01",
    title: `Free ${siteConfig.callMinutes}-min call.`,
    description: "Tell me the business problem, not the stack. I'll say honestly if I'm the right person.",
    accentHex: "#FFE600",
  },
  {
    number: "02",
    title: "A written plan in 48 hours.",
    description: "Scope, price, what I'd do first.",
    accentHex: "#4ECDC4",
  },
  {
    number: "03",
    title: "Weekly working releases.",
    description: "You see progress in the product, not in status reports.",
    accentHex: "#FF6B6B",
  },
];

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface Stat {
  value: string;
  label: string;
  accentHex: string;
  rotate: string;
}

export const stats: Stat[] = [
  { value: "8+",  label: "Years in Tech",       accentHex: "#FFE600", rotate: "-rotate-1" },
  { value: "24",  label: "Insights Published",  accentHex: "#4ECDC4", rotate: "rotate-1" },
  { value: "30+", label: "Projects Shipped",    accentHex: "#FF6B6B", rotate: "rotate-1" },
  { value: "6+",  label: "Countries Served",    accentHex: "#22C55E", rotate: "-rotate-1" },
];

// ── Timeline ──────────────────────────────────────────────────────────────────

export interface TimelineItem {
  year: string;
  event: string;
}

export const timeline: TimelineItem[] = [
  { year: "2018", event: "First freelance client" },
  { year: "2020", event: "Enterprise clients, national-scale projects" },
  { year: "2022", event: "International expansion, technical leadership roles" },
  { year: "2023", event: "Real estate tech, EU & MENA clients" },
  { year: "2024", event: "US engagement — full CTO role, team of 18" },
  { year: "2026", event: "Independent CTO practice, Barcelona" },
];

// ── Trust signals (replaces notableWork) ─────────────────────────────────────

export interface TrustSignal {
  id: string;
  title: string;
  description: string;
  accentHex: string;
}

export const trustSignals: TrustSignal[] = [
  {
    id: "zero-ghosting",
    title: "8 YEARS, ZERO GHOSTING",
    description:
      "Every project delivered. Every client can reach me. I don't disappear.",
    accentHex: "#FFE600",
  },
  {
    id: "team-of-18",
    title: "TEAM OF 18",
    description:
      "Not a solo freelancer pretending to scale. I've actually led cross-functional teams — designers, developers, operations.",
    accentHex: "#4ECDC4",
  },
  {
    id: "six-countries",
    title: "6+ COUNTRIES",
    description:
      "US, Cyprus, Germany, UAE, UK, Ukraine. Different markets, different problems, same delivery standard.",
    accentHex: "#FF6B6B",
  },
  {
    id: "enterprise-and-startup",
    title: "ENTERPRISE & STARTUP",
    description:
      "From national-scale data systems (Prozorro API integration) to scrappy MVPs. I adapt to the context.",
    accentHex: "#A855F7",
  },
];

export const trustSubtext =
  "Membership platform (US, California, 18-person team) · Fintech virtual cards · AgriTech operations (Ukraine) · Real estate CRM (Cyprus) · Procurement analytics · EdTech rankings · 20+ bots across EU & CIS — the work is real, the NDAs are too.";

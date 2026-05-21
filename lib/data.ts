// ─────────────────────────────────────────────────────────────────────────────
// All site content lives here. Edit copy without touching components.
// ─────────────────────────────────────────────────────────────────────────────

export const siteConfig = {
  name: "tfpdev",
  email: "oleksii@tfpdev.com",
  linkedinUrl: "https://www.linkedin.com/in/oleksii-kuropatkin1/?locale=uk",
  calendlyUrl: "https://calendly.com/oleksii-tfpdev/30min",
  availability: {
    nav: "1 retainer · Q3 · waitlist",
    terminal: "AVAILABLE — 1 retainer · Q3 2026 · consulting open",
    footerBadge: "1 retainer · Q3 2026",
    footerLine:
      "One retainer slot for Q3 2026. Consulting, audits & rescue work — usually room. Waitlist open.",
  },
};

export const clientQuote = {
  text: "Because you ship. When you say it'll be done Friday — it's done Friday. You don't disappear. You don't show up with excuses. You just do the work.",
  context:
    "My longest-running client — big business, can afford whoever he wants. I asked him once, half-joking, why he's still paying me when he has smarter engineers in his network.",
  attribution: "Longest-running client · US membership platform",
};

// ── Services ─────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  accent: string;
  accentHex: string;
  iconName: string;
  title: string;
  bestFor: string;
  description: string;
  deliverables: string[];
  pricing: string;
  wide?: boolean;
}

export const services: Service[] = [
  {
    id: "cto",
    accent: "bg-brutal-yellow",
    accentHex: "#FFE600",
    iconName: "Rocket",
    title: "CTO as a Service",
    bestFor: "Startups post-funding that need technical leadership yesterday.",
    description:
      "Your startup needs a CTO but can't afford a $300k/year hire. I step in as your fractional technical leader — designing how your product is built, setting up automated deployment pipelines so updates go live safely, hiring and managing developers, running weekly development cycles, and making sure your tech decisions today won't cost you tomorrow.",
    deliverables: [
      "Technical architecture (how your product is structured under the hood)",
      "Team hiring, onboarding, and mentoring",
      "Automated deployment (code goes live without manual uploads or prayer)",
      "Weekly development cycles & delivery tracking",
      "Choosing the right tools & services for your stack",
      "Technical due diligence (what investors check before writing a check)",
    ],
    pricing: "Monthly retainer · from $3k/mo",
    wide: true,
  },
  {
    id: "mvp",
    accent: "bg-brutal-blue",
    accentHex: "#4ECDC4",
    iconName: "Zap",
    title: "MVP & Product Development",
    bestFor: "Founders with a validated idea and a launch deadline.",
    description:
      "You have an idea and a deadline. I turn it into a production-ready product in 8–12 weeks — not a prototype that falls apart, but a real system with payments, auth, admin panels, and deployment pipelines.",
    deliverables: [
      "Full-stack web application (front-end + back-end — everything users see and everything behind it)",
      "Database design & API architecture (how your data is stored and how systems talk to each other)",
      "Payment integration (Stripe, crypto, custom)",
      "Admin dashboard & analytics",
      "Cloud deployment (your product hosted, live, and accessible worldwide)",
      "Documentation & handoff",
    ],
    pricing: "Fixed project · starting $2k",
  },
  {
    id: "bots",
    accent: "bg-brutal-coral",
    accentHex: "#FF6B6B",
    iconName: "Bot",
    title: "Bots & Automation",
    bestFor: "Teams drowning in manual work. Operations that should run themselves.",
    description:
      "Telegram bots, Discord bots, WhatsApp integrations, workflow automation — if your team does something manually more than twice, I can automate it. From simple notification bots to complex multi-step business logic.",
    deliverables: [
      "Telegram / Discord / WhatsApp bots",
      "CRM and tool integrations (API-to-API)",
      "Automated reporting & notifications",
      "Data scraping & processing pipelines",
      "Zapier/Make replacement with custom code",
      "Scheduled tasks & background workers",
    ],
    pricing: "Per project · Custom quote",
  },
  {
    id: "payments",
    accent: "bg-brutal-purple",
    accentHex: "#A855F7",
    iconName: "CreditCard",
    title: "Payment Systems & Fintech",
    bestFor: "Products where money moves — marketplaces, SaaS billing, crypto.",
    description:
      "I've built payment infrastructure from scratch — card issuance, crypto wallets, subscription billing, marketplace payouts. If money moves through your product, I know how to make it work reliably.",
    deliverables: [
      "Stripe / payment gateway integration",
      "Subscription & recurring billing logic",
      "Marketplace split payments",
      "Crypto payment flows",
      "KYC/AML compliance integration",
      "Transaction monitoring & reconciliation",
    ],
    pricing: "Per integration · Custom quote",
  },
  {
    id: "proptech",
    accent: "bg-brutal-green",
    accentHex: "#22C55E",
    iconName: "Building2",
    title: "Real Estate Tech",
    bestFor: "EU agencies and PropTech startups replacing spreadsheets with systems.",
    description:
      "CRM systems, property listing platforms, management dashboards. Built for EU agencies and PropTech startups who are tired of spreadsheets and WhatsApp groups.",
    deliverables: [
      "Property listing & search platform",
      "Agent/client CRM",
      "Automated lead capture & follow-up",
      "Property management dashboards",
      "MLS / listing feed integrations",
      "Client portals (buyer/seller/tenant)",
    ],
    pricing: "Per project · Custom quote",
  },
  {
    id: "devops",
    accent: "bg-brutal-orange",
    accentHex: "#F97316",
    iconName: "Server",
    title: "DevOps & Infrastructure",
    bestFor: "Anyone whose deployment process involves prayer.",
    description:
      "Servers, deployments, monitoring, telephony, automation tooling. The unglamorous work that keeps everything running. I set it up once, properly, so you don't think about it again.",
    deliverables: [
      "Server setup (where your product actually runs)",
      "Docker containerization (packaging your app so it runs the same everywhere)",
      "Automated deployment pipeline (push code → it goes live, safely)",
      "Monitoring & alerting (know when something breaks before your users do)",
      "Telephony & communication systems",
      "Cloud cost optimization",
    ],
    pricing: "Per engagement · Hourly or fixed",
  },
];

// ── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  accentHex: string;
  title: string;
  location: string;
  tags: string[];
  description: string;
  metrics: string;
  underNda?: boolean;
  featured?: boolean; // spans 2 cols on desktop
  insightLink?: string; // link to a relevant insight
  insightText?: string; // link label
}

export const projects: Project[] = [
  {
    id: "membership",
    accentHex: "#FFE600",
    title: "Full-Scale Membership Platform",
    location: "CALIFORNIA, US",
    tags: ["PAYMENTS", "E-COMMERCE", "COMMUNITY", "EVENTS", "TEAM MANAGEMENT"],
    description:
      "Built the entire digital infrastructure for a California-based organization — two parallel product lines, one team. Membership tiers, payments, online store, event scheduling, community platform, and driver delivery. Led a dev team of 7 at peak; 18 people across the wider program.",
    metrics:
      "3 months idea → production · 3k+ monthly members · $50k+/mo processed · 1 year in prod · Retention & ops scaling",
    underNda: true,
    featured: true,
    insightLink: "/insights",
    insightText: "12 insights from building this project",
  },
  {
    id: "ticketing",
    accentHex: "#EC4899",
    title: "Fintech — Event Ticketing Platform",
    location: "US",
    tags: ["FINTECH", "TICKETING", "PAYMENTS", "RECOVERY"],
    description:
      "Early-stage ticketing for small and mid-size venues. Stripe was wired without proper checkout independence or payment status tracking — fine in demos, would fall apart under real load. Rebuilt payments and checkout; MVP in 8 weeks. First venue onboarded (~30k/yr); ticket sales launching now.",
    metrics:
      "MVP in 8 weeks · Stripe & checkout rebuilt · First venue live · Sales launching",
    underNda: true,
    insightLink: "/insights#insight-12",
    insightText: "Payment pipeline under pressure",
  },
  {
    id: "fintech",
    accentHex: "#A855F7",
    title: "Fintech — Virtual Card Platform",
    location: "TURKEY",
    tags: ["FINTECH", "CRYPTO", "PAYMENTS", "KYC/AML"],
    description:
      "Payment system where users load crypto and spend via virtual cards. Built the entire backend from zero — KYC verification, compliance checks, transaction processing, card issuance API. Not a wrapper around someone else's SDK.",
    metrics:
      "Built from zero · Live in 5 months · 300 users · 2k transactions/month at launch",
    insightLink: "/insights#insight-12",
    insightText: "How we built alternative payment rails",
  },
  {
    id: "agritech",
    accentHex: "#22C55E",
    title: "AgriTech — Farm Operations System",
    location: "UKRAINE",
    tags: ["AGRITECH", "AUTOMATION", "REAL-TIME", "GPS"],
    description:
      "Replaced spreadsheets and manual logging across multiple farm locations with a real-time operational system. GPS fuel tracking per vehicle, automated shift logging with geofencing, performance-based bonus calculations. The kind of system where getting the data wrong costs real money.",
    metrics: "Real-time GPS tracking · Automated payroll calculations · Multi-location",
    insightLink: "/insights#insight-1",
    insightText: "Real-time tracking architecture decisions",
  },
  {
    id: "realestate",
    accentHex: "#F97316",
    title: "PropTech — Real Estate CRM & Listings",
    location: "CYPRUS",
    tags: ["PROPTECH", "CRM", "AUTOMATION", "EU"],
    description:
      "A Limassol agency ran ~80 agents through Telegram and spreadsheets — the busiest shop in the city in 2023. Built listings, CRM, bots, and automated follow-ups. Replaced manual chaos with a system that actually scaled.",
    metrics:
      "80 agents off Telegram · Lead response ~half-day → ~1 hour · 2.5 years in prod · Top in Limassol by 2023",
    insightLink: "/insights#insight-16",
    insightText: "Why we built native instead of integrating",
  },
  {
    id: "govtech",
    accentHex: "#4ECDC4",
    title: "GovTech — Procurement Data Analytics",
    location: "UKRAINE",
    tags: ["GOVTECH", "DATA", "ENTERPRISE", "API INTEGRATION"],
    description:
      "Analytics platform consuming Ukraine's national procurement API (Prozorro). Automated extraction and processing of large-scale public purchasing records, anomaly detection, compliance reporting. The data volumes were genuinely large — this wasn't a startup dataset.",
    metrics: "National-scale data processing · Prozorro API integration · Compliance analytics",
    insightLink: "/insights#insight-1",
    insightText: "National-scale data pipeline decisions",
  },
  {
    id: "edtech",
    accentHex: "#FFE600",
    title: "EdTech — University Rankings Platform",
    location: "UKRAINE",
    tags: ["EDTECH", "DATA SCIENCE", "ANALYTICS", "RANKINGS"],
    description:
      "Data science and analytics platform for ranking Ukrainian higher education institutions. Data collection, processing pipelines, scoring algorithms, and public-facing ranking dashboards. One of the earliest large-scale projects — built for Forbes Ukraine.",
    metrics: "National university rankings · Data science · Forbes Ukraine",
    insightLink: "/insights",
    insightText: "Data pipeline and ranking decisions",
  },
  {
    id: "bots-consolidated",
    accentHex: "#FF6B6B",
    title: "Telegram Bots & Automation — 20+ Projects",
    location: "EU & CIS",
    tags: ["BOTS", "TELEGRAM", "AUTOMATION", "MULTI-INDUSTRY"],
    description:
      "20+ Telegram bots across 6 countries and 5 industries. Inventory alerts, crop monitoring, marketing automation, order management, customer support. Some are simple notification pipes. Some run complex multi-step business logic that replaced entire manual workflows.",
    metrics: "20+ bots shipped · 6 countries · Agriculture, e-commerce, marketing, operations",
    insightLink: "/insights#insight-11",
    insightText: "Automation architecture patterns",
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
    title: "You Talk,\nI Listen",
    description:
      "Book a free 15-minute call. Tell me your business problem — not your tech wishlist. I'll be honest about whether I can help and what it will take. No agenda, no pitch.",
    accentHex: "#FFE600",
  },
  {
    number: "02",
    title: "I Propose",
    description:
      "Within 48 hours you get a clear plan: architecture, timeline, team needs, and pricing. No 30-page decks. No bullshit. A real answer.",
    accentHex: "#4ECDC4",
  },
  {
    number: "03",
    title: "I Deliver",
    description:
      "I embed with your team, set up processes, and ship the product. Weekly updates, full transparency. I own the outcome — not just the code.",
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

// ── Manifesto strip ───────────────────────────────────────────────────────────

export const manifestoItems = [
  "I DON'T DO ESTIMATES WITHOUT UNDERSTANDING YOUR PROBLEM",
  "I DON'T WRITE CODE WITHOUT ARCHITECTURE",
  "I DON'T DISAPPEAR AFTER DEPLOYMENT",
  "I DON'T TAKE MORE THAN 3 CLIENTS",
  "I SHIP",
  "I DON'T DO ESTIMATES WITHOUT UNDERSTANDING YOUR PROBLEM",
  "I DON'T WRITE CODE WITHOUT ARCHITECTURE",
  "I DON'T DISAPPEAR AFTER DEPLOYMENT",
  "I DON'T TAKE MORE THAN 3 CLIENTS",
  "I SHIP",
];

// ── Anti-portfolio ────────────────────────────────────────────────────────────

export const antiPortfolioItems = [
  "I don't ship half-assed MVPs. If it goes to production, it works.",
  "I don't compete on price. I compete on outcomes.",
  "I don't write code without understanding the business problem first.",
  "I don't take on more than 3 clients at a time.",
  "I don't start projects I can't finish.",
];

// ── Wild card service ("Something Else?") ────────────────────────────────────

export const wildCard = {
  id: "wild",
  iconName: "HelpCircle",
  title: "Something Else?",
  bestFor: "If none of the above fit — but you know you need technical help.",
  description:
    "Business doesn't fit into neat categories. Maybe you need a technical audit of your existing system. Maybe you need someone to interview and vet developer candidates. Maybe you need to migrate from one platform to another, set up analytics, build an internal tool, or just figure out what the hell your current dev team is actually doing. I've done all of that and more. If it involves code, architecture, or technical decisions — chances are I can help.\n\nAlso: if things already went sideways — a developer ghosted, a project stalled, a codebase nobody understands — I've been there before. I'll tell you what you have and what to do next.",
  examples: [
    '"Our dev disappeared — help us understand what we have"',
    "Rescue a failed project",
    "Architecture review before fundraising",
    "Technical audit of an existing codebase",
    "Platform migration (legacy → modern stack)",
    "Interview & vet developer candidates",
    "Internal tools & admin dashboards",
    "Analytics & tracking setup",
  ],
  pricing: "Let's talk · First call is free",
};

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
      "US, California, Turkey, Cyprus, Germany, UAE, Ukraine. Different markets, different problems, same delivery standard.",
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
  "Membership platform (US, California, 18-person team) · Fintech virtual cards (Turkey) · AgriTech operations (Ukraine) · Real estate CRM (Cyprus) · Procurement analytics · EdTech rankings · 20+ bots across EU & CIS — the work is real, the NDAs are too.";

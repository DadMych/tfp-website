// ─────────────────────────────────────────────────────────────────────────────
// Insights — decisions from a real 18-person, 6-month platform build
// ─────────────────────────────────────────────────────────────────────────────

export type InsightCategory =
  | "architecture"
  | "team"
  | "payments"
  | "product"
  | "devops"
  | "lessons"
  | "stakeholders";

export type Lesson = "business" | "pragmatism" | "infrastructure";

export interface LessonDef {
  key: Lesson;
  number: string;
  title: string;
  subtitle: string;
}

export const lessons: LessonDef[] = [
  {
    key: "business",
    number: "01",
    title: "Build for the business,\nnot for the résumé",
    subtitle: "Textbooks teach you to build it right. Experience teaches you to build what matters.",
  },
  {
    key: "pragmatism",
    number: "02",
    title: "Pragmatism ships.\nPerfection doesn't.",
    subtitle: "The best technical decision is the one that ships on time and doesn't explode later.",
  },
  {
    key: "infrastructure",
    number: "03",
    title: "Infrastructure and process\nare the product",
    subtitle: "The unglamorous work is where projects survive or die.",
  },
];

export interface SeeAlsoRef {
  id: number;
  label: string;
}

export interface Insight {
  id: number;
  title: string;
  category: InsightCategory;
  secondaryCategory?: InsightCategory;
  lesson: Lesson;
  situation: string;
  decision: string;
  outcome: string;
  highlight: string;
  tags: string[];
  seeAlso?: SeeAlsoRef[];
  redacted?: boolean;
}

export interface ExplainerCard {
  id: string;
  term: string;
  explanation: string;
  appearsAfter: number;
}

export const categories: { key: "all" | InsightCategory; label: string; color: string }[] = [
  { key: "all",          label: "ALL",              color: "#000000" },
  { key: "architecture", label: "ARCHITECTURE",     color: "#FFE600" },
  { key: "team",         label: "TEAM & PROCESS",   color: "#4ECDC4" },
  { key: "payments",     label: "PAYMENTS & E-COM", color: "#A855F7" },
  { key: "product",      label: "PRODUCT",          color: "#FF6B6B" },
  { key: "devops",       label: "DEVOPS",           color: "#F97316" },
  { key: "lessons",      label: "HARD LESSONS",     color: "#FF0000" },
  { key: "stakeholders", label: "STAKEHOLDERS",     color: "#22C55E" },
];

export const insights: Insight[] = [

  // ═══════════════════════════════════════════════════════════════════════
  // LESSON 1: Build for the business, not for the résumé
  // ids: 3, 9, 12, 13, 14, 15, 16, 17, 21, 23
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 3,
    title: "Don't replace what works — extend it",
    category: "architecture",
    secondaryCategory: "stakeholders",
    lesson: "business",
    situation:
      "The organization ran their entire product catalog and pricing through an existing POS system. Staff had years of muscle memory built around it. We had a choice: rebuild that functionality in our platform (more control, more work) or integrate with the POS as the source of truth (less control, faster delivery, zero retraining).",
    decision:
      "We made the POS the single source of truth and positioned every integration as 'this makes your existing tools more powerful.' The platform reads from the POS at runtime — it never competes with it. This was both a technical architecture decision AND a stakeholder management decision. Staff didn't have to learn a new catalog system. The platform just worked with what they already knew.",
    outcome:
      "Zero retraining cost. Staff adopted the platform in days — not weeks, not months. Catalog updates in the POS appeared on the platform in near-real-time. We never had a sync complaint. The lesson has two sides: architecturally, don't rebuild what works. Organizationally, the best integration is the one your users don't notice.",
    highlight: "the best integration is the one your users don't notice",
    tags: ["integration", "POS", "adoption", "stakeholders", "pragmatism"],
  },
  {
    id: 9,
    title: "Mandatory onboarding — enforced at the infrastructure level",
    category: "product",
    secondaryCategory: "architecture",
    lesson: "business",
    situation:
      "Platforms that let members skip profile completion end up with unreliable data — breaking reporting, communications, and access control downstream. But enforcing onboarding page-by-page in application code is fragile: any new page without the check is an instant access gap.",
    decision:
      "We made onboarding non-negotiable AND enforced it at the infrastructure layer — edge middleware, not page logic. Cookie state drives routing decisions before any application code runs. There is exactly one place where access rules live. No opt-outs, no 'remind me later.'",
    outcome:
      "Member data quality at launch was dramatically better than previous rollouts — complete profiles from day one instead of months of cleanup. Zero instances of members bypassing onboarding. When rules changed, one file update, one deploy. We didn't measure the exact completion rate against historical — but the operations team stopped complaining about data quality. First time.",
    highlight: "the operations team stopped complaining about data quality. First time",
    tags: ["onboarding", "middleware", "data-quality", "enforcement"],
  },
  {
    id: 12,
    title: "When traditional payment rails aren't available, you build your own",
    category: "payments",
    lesson: "business",
    situation:
      "Traditional payment processors presented regulatory and operational friction for this organization's specific product vertical. Standard providers were evaluated and determined not to be viable — a situation more common in certain industries than vendors admit.",
    decision:
      "Built a production-grade integration with an alternative payment provider, covering the full webhook lifecycle: signature verification, payload transformation, retry logic, timeout handling, and forwarding to downstream order systems.",
    outcome:
      "Payment acceptance went from impossible to fully operational. The webhook pipeline ran reliably in production — retries caught edge cases that would silently fail in a less disciplined integration. I can't give you a '99.9% uptime' figure because we didn't have formal SLA monitoring on it. What I can tell you: payments worked. Consistently. For a vertical where the traditional processors said no.",
    highlight: "payments worked. Consistently",
    tags: ["payments", "alternative-payments", "webhooks", "integration"],
  },
  {
    id: 13,
    title: "Delivery isn't a feature — it's its own domain",
    category: "payments",
    lesson: "business",
    situation:
      "Physical product delivery was central to the organization's revenue model, not a peripheral feature. Treating it as an add-on would have produced an add-on result — functional in demos, brittle in production.",
    decision:
      "Designed delivery as its own operational domain from the architecture phase: dedicated driver-facing dashboard, packing workflows, real-time chat, and route calculation — all fully integrated with member accounts and inventory.",
    outcome:
      "Delivery went from nonexistent to a competitive differentiator. Coordination that used to require phone calls and WhatsApp messages happened through the driver dashboard instead. I don't have before/after timing data — we didn't benchmark the old chaos. But the organization cited delivery as a top reason members stayed engaged. That wasn't in any spec. It emerged from treating delivery as a real domain.",
    highlight: "the organization cited delivery as a top reason members stayed engaged. That wasn't in any spec",
    tags: ["delivery", "domain-design", "operations", "competitive-advantage"],
  },
  {
    id: 14,
    title: "Referrals and credits tied to onboarding — not bolted on after",
    category: "payments",
    lesson: "business",
    situation:
      "The organization needed organic member growth mechanisms that didn't require marketing spend. Generic discount codes don't create lasting loyalty; credits tied to genuine participation do.",
    decision:
      "Built a referral and credit system integrated directly into onboarding. Members earned credits through verified referrals; credits applied at checkout through the same session as every other account action.",
    outcome:
      "Referrals produced real member growth with zero marketing spend. I don't have the exact percentage — and I'd rather not guess — but the referral channel was active and producing sign-ups within the first quarter. Total marketing budget to activate it: $0. The system paid for its engineering cost quickly.",
    highlight: "Total marketing budget to activate it: $0",
    tags: ["referrals", "growth", "onboarding", "zero-cost-acquisition"],
  },
  {
    id: 15,
    title: "Know what NOT to build — and document why",
    category: "product",
    lesson: "business",
    situation:
      "There was early pressure to replicate product management, pricing, and vendor management inside the web platform. This would have created a second system to maintain and keep in sync.",
    decision:
      "Drew a clear boundary: the POS owns commerce configuration; the platform owns member experience and operations. Any request to build functionality that duplicated what the POS did was explicitly declined and documented.",
    outcome:
      "The team avoided maintaining a parallel product catalog. Every feature you don't build is a feature you don't have to support. The time saved by not rebuilding the catalog system was measured in weeks of engineering — time that went into features that actually mattered.",
    highlight: "The time saved by not rebuilding the catalog system was measured in weeks",
    tags: ["scope-discipline", "say-no", "product-strategy", "pragmatism"],
    seeAlso: [{ id: 3, label: "Don't replace what works — extend it" }],
  },
  {
    id: 16,
    title: "Community features: native, not third-party",
    category: "product",
    lesson: "business",
    situation:
      "Embedding third-party community tools would have required members to manage separate accounts and context-switch constantly. Engagement in a disconnected tool rarely sustains.",
    decision:
      "Posts, messaging, and community rooms were built natively — inside the same authenticated session as every other platform feature. Community was treated as a core module, not an integration.",
    outcome:
      "Community activity stayed within the platform, measurable and connected to member profiles. Members who used community features stuck around longer — noticeably. I don't have a clean A/B test to give you a multiplier, but the correlation was clear enough that community became a retention priority.",
    highlight: "the correlation was clear enough that community became a retention priority",
    tags: ["community", "retention", "native-build", "engagement"],
  },
  {
    id: 17,
    title: "Separate mandatory from optional — always",
    category: "product",
    lesson: "business",
    situation:
      "Stakeholders initially wanted all onboarding fields mandatory. Pilot testing revealed significant drop-off — the questionnaire was too long to feel reasonable at first registration.",
    decision:
      "Split onboarding into two explicit tiers: mandatory (minimum for access) and optional (profile enrichment presented post-login). The mandatory tier was kept ruthlessly short. Optional questions surfaced only after members experienced the platform's value.",
    outcome:
      "Mandatory onboarding completion was high — the middleware enforcement meant there was no way around it. What surprised us: a meaningful chunk of members voluntarily completed the optional tier too. We expected most people to skip it. They didn't. Turns out not forcing something makes people more willing to do it.",
    highlight: "Turns out not forcing something makes people more willing to do it",
    tags: ["onboarding", "UX", "conversion", "user-psychology"],
    seeAlso: [{ id: 9, label: "Mandatory onboarding — enforced at the infrastructure level" }],
  },
  {
    id: 21,
    title: "One dashboard, one source of truth for leadership",
    category: "stakeholders",
    lesson: "business",
    situation:
      "Leadership was making decisions by piecing together information from multiple disconnected sources — POS reports, spreadsheets, and messages from staff. The cognitive cost was high and the result was often outdated.",
    decision:
      "Designed the admin dashboard as a single operational pane: inventory, member data, delivery status, payroll, marketing analytics, and community health in one authenticated interface.",
    outcome:
      "Leadership went from piecing together information across multiple sources to having one screen. Decision-making got faster — they told us that directly. The dashboard became the first thing opened in every operational meeting. We didn't run a productivity study. We didn't need to. The behavior change was obvious.",
    highlight: "The behavior change was obvious",
    tags: ["dashboard", "leadership", "decision-making", "unified-view"],
  },
  {
    id: 23,
    title: "Translate architecture into business risk language",
    category: "stakeholders",
    lesson: "business",
    situation:
      "Technical decisions are invisible to non-technical stakeholders until something goes wrong. Stakeholders who don't understand the rationale can't evaluate trade-offs or provide informed input.",
    decision:
      "Every significant technical decision was documented in business terms: what risk it mitigated, what it would cost to change later, and what the organization would need to do differently if it was wrong. Architecture reviews included non-technical stakeholders.",
    outcome:
      "Stakeholders made better-informed requests, and technical decisions had explicit organizational buy-in. When edge cases appeared in production, stakeholders understood why the mitigation worked — because they had been part of the decision.",
    highlight: "stakeholders understood why the mitigation worked — because they had been part of the decision",
    tags: ["communication", "risk", "documentation", "trust"],
    seeAlso: [{ id: 22, label: "Name scope creep directly — don't absorb it silently" }],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LESSON 2: Pragmatism ships. Perfection doesn't.
  // ids: 1, 2, 4, 10, 11, 18, 19(redacted), 20
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 1,
    title: "Why we went serverless microservices from day one",
    category: "architecture",
    lesson: "pragmatism",
    situation:
      "The platform needed to cover many independent operational domains — member onboarding, retail, physical delivery, staff tooling, community features, and analytics. A monolithic backend would have created tight coupling between unrelated concerns and made independent scaling impossible.",
    decision:
      "Architected the backend as hundreds of independent serverless functions — each route handler a discrete, stateless microservice with its own scope and failure boundary. Domains that needed different scaling characteristics were isolated from the start.",
    outcome:
      "Each domain scaled and failed independently. During peak delivery hours, checkout traffic spiked hard without adding latency to community page loads. No cross-domain outages in production. That's the whole point of isolation — and it actually worked.",
    highlight: "That's the whole point of isolation — and it actually worked",
    tags: ["serverless", "microservices", "scaling", "isolation"],
  },
  {
    id: 2,
    title: "We built custom auth because off-the-shelf didn't fit",
    category: "architecture",
    lesson: "pragmatism",
    situation:
      "Off-the-shelf auth providers make assumptions about session models that didn't fit: custom role hierarchy, staff-level access tiers, ban enforcement, and the ability to forcibly invalidate sessions across devices instantly.",
    decision:
      "Designed a custom JWT + bcrypt authentication system with a dedicated invalidation table enabling server-side session revocation. Every authenticated API call validates token integrity, account status, and role in a single middleware pass.",
    outcome:
      "Zero auth-related incidents in production. Session revocation worked instantly when we needed it — an account was suspended and kicked from all devices in real time. Not theoretical capability. We used it.",
    highlight: "Not theoretical capability. We used it",
    tags: ["auth", "security", "JWT", "custom-build"],
  },
  {
    id: 4,
    title: "Hybrid inventory: granular tracking without breaking what exists",
    category: "architecture",
    lesson: "pragmatism",
    situation:
      "The existing POS couldn't represent inventory across multiple distinct physical storage locations. Staff needed location-level counts — per safe, per storage area — that the POS data model simply didn't support.",
    decision:
      "Stored inventory counts in our own database with a full audit log, then provided a deliberate one-way sync to the POS only when staff confirmed accuracy. The two systems stayed decoupled, with the push as an explicit staff action — not an automatic background sync.",
    outcome:
      "Staff got granular location-level tracking across multiple storage locations plus a full audit trail that never existed before. Within the first weeks, the audit log started flagging discrepancies — not hundreds, but enough that the operations team said 'how did we manage without this?' That's the bar.",
    highlight: "'how did we manage without this?' That's the bar",
    tags: ["inventory", "audit-trail", "hybrid-architecture", "data-sync"],
    seeAlso: [
      { id: 3, label: "Don't replace what works — extend it" },
      { id: 9, label: "Mandatory onboarding — enforced at the infrastructure level" },
    ],
  },
  {
    id: 10,
    title: "Admin permissions that don't need a developer to change",
    category: "team",
    lesson: "pragmatism",
    situation:
      "The admin dashboard covered many operational domains — inventory, payroll, delivery, marketing analytics, community moderation. A simple 'admin' role couldn't express the access control the organization actually needed.",
    decision:
      "Built a data-driven permission system with a custom React hook and wrapper component. Each admin module declares its required permission; the system handles rendering and API access enforcement. Adding a new module means one config entry, not a new access control implementation.",
    outcome:
      "Permissions stayed current through multiple team restructures. Adding a new admin module with full permission support: one config entry, no custom code, deployed in minutes. The operations team adjusted roles without filing a dev ticket. That was the goal.",
    highlight: "The operations team adjusted roles without filing a dev ticket",
    tags: ["permissions", "admin", "RBAC", "developer-experience"],
  },
  {
    id: 11,
    title: "AI for back-office — practical, not performative",
    category: "team",
    lesson: "pragmatism",
    situation:
      "The organization had access to large external datasets relevant to planning decisions. Manual analysis was inconsistent and time-consuming, with results varying based on who was doing it.",
    decision:
      "Integrated AI into a dedicated internal analysis workflow — combining external data fetching with structured AI-assisted analysis. A back-office productivity tool with clear data boundaries, not a consumer-facing feature bolted on for appearances.",
    outcome:
      "Analysis that used to take an afternoon of manual work became a short workflow. I won't give you a fake '87% faster' number — but the person who used to do it manually switched to the AI workflow and never went back. That's the metric that matters.",
    highlight: "switched to the AI workflow and never went back. That's the metric that matters",
    tags: ["AI", "automation", "back-office", "practical-AI"],
  },
  {
    id: 18,
    title: "No automated tests in phase one — and why that was the right call",
    category: "lessons",
    lesson: "pragmatism",
    situation:
      "In the first phase of a platform covering multiple operational domains simultaneously, a comprehensive test suite would have consumed a significant portion of engineering capacity — urgently needed to ship working features.",
    decision:
      "Made an explicit, documented call to defer automated testing in phase one, relying on code review, staging validation, and production monitoring. The decision included a commitment to add tests in phase two — and we did. Estimated capacity saved: weeks of engineering time redirected to shipping features.",
    outcome:
      "Phase one shipped on schedule. Phase two tests were written with actual knowledge of what breaks in production, not guesses. We wrote fewer tests than originally estimated, but each one targeted a real failure mode we'd observed. That's a better test suite.",
    highlight: "each one targeted a real failure mode we'd observed. That's a better test suite",
    tags: ["testing", "pragmatism", "trade-offs", "shipping"],
  },
  {
    id: 19,
    title: "The one we can't talk about",
    category: "lessons",
    lesson: "pragmatism",
    situation: "",
    decision: "",
    outcome: "",
    highlight: "",
    tags: [],
    redacted: true,
  },
  {
    id: 20,
    title: "Three UI libraries in one project — on purpose",
    category: "lessons",
    lesson: "pragmatism",
    situation:
      "Different domains of the platform had genuinely different UI requirements — member-facing experience needed polish, staff dashboards needed data density, admin tooling needed rapid prototyping speed.",
    decision:
      "Made deliberate library choices per domain: Tailwind for member-facing UI, Ant Design for data-heavy staff interfaces, and Material UI where specific components provided the right interaction model.",
    outcome:
      "Each domain got tooling appropriate to its purpose. The constraint we enforced: consistency within a domain, pragmatism across domains. Mixing UI libraries requires clear rules about when each applies — without those rules, the codebase becomes incoherent.",
    highlight: "Mixing UI libraries requires clear rules about when each applies",
    tags: ["UI", "libraries", "pragmatism", "design-systems"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LESSON 3: Infrastructure and process are the product
  // ids: 5, 6, 7, 8, 22
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 5,
    title: "Self-hosted observability at 10% of the SaaS price",
    category: "devops",
    lesson: "infrastructure",
    situation:
      "Commercial observability platforms at scale are expensive, and they give you less control over data retention, alerting logic, and dashboard customization than the project needed.",
    decision:
      "Deployed a self-hosted Loki + Grafana stack on a dedicated VPS using Docker Compose, integrated with CI/CD for automated deployments. The application pushes structured logs; Grafana provides real-time operational dashboards.",
    outcome:
      "Full observability at a fraction of equivalent SaaS pricing. The exact saving depends on what you'd compare it to, but we're talking about a VPS bill vs enterprise observability subscriptions — it's not close. The entire stack was rebuilt from the repo during an actual VPS migration. It took under an hour. That number is real.",
    highlight: "It took under an hour. That number is real",
    tags: ["observability", "grafana", "self-hosted", "cost-optimization"],
  },
  {
    id: 6,
    title: "Infrastructure as code from day one — not after the first fire",
    category: "devops",
    lesson: "infrastructure",
    situation:
      "Manually configured infrastructure doesn't survive server migrations, team changes, or incident recovery. If the person who set up the VPS isn't available when it needs to be rebuilt, the organization is in trouble.",
    decision:
      "Every infrastructure component is version-controlled: Docker Compose services, Nginx configuration, backup schedules, monitoring setup. CI/CD automatically deploys infrastructure changes when the config directory is updated.",
    outcome:
      "The entire observability stack was rebuilt during the project when the VPS needed replacing — recovered in under an hour. Infrastructure-as-code is non-negotiable for production systems.",
    highlight: "Infrastructure-as-code is non-negotiable for production systems",
    tags: ["IaC", "docker", "disaster-recovery", "automation"],
  },
  {
    id: 7,
    title: "Three environments or you're gambling with production",
    category: "devops",
    lesson: "infrastructure",
    situation:
      "A platform with live member accounts, financial transactions, and delivery operations cannot absorb untested changes into production. The cost of a production incident far exceeds the cost of a staging environment.",
    decision:
      "Maintained a full three-environment pipeline from day one — development, staging mirroring production configuration, and production. Every change validated in staging before promotion. Staging used production-equivalent data fixtures, not toy data.",
    outcome:
      "Multiple significant issues were caught in staging before reaching production — delivery workflow edge cases, data sync timing bugs, things that only show up with realistic data. I didn't keep a count. Enough that nobody on the team questioned the cost of maintaining staging.",
    highlight: "nobody on the team questioned the cost of maintaining staging",
    tags: ["environments", "staging", "deployment", "risk-management"],
  },
  {
    id: 8,
    title: "'We have backups' means nothing without verification",
    category: "devops",
    lesson: "infrastructure",
    situation:
      "'We have backups' is a meaningless statement unless you know the backups are current, complete, and restorable. Many organizations discover their backup process is broken at exactly the moment they need it most.",
    decision:
      "Automated database backups through the infrastructure stack, with scheduled verification that backups are being created and are non-empty. Backup status is visible in the operational dashboard.",
    outcome:
      "Backup verification runs on a schedule. Recovery time: under an hour for full database restoration — tested during the project, not theoretical. The distinction between 'we have backups' and 'we've actually restored from backups' is significant. We crossed that line.",
    highlight: "We crossed that line",
    tags: ["backups", "verification", "disaster-recovery", "operations"],
  },
  {
    id: 22,
    title: "Name scope creep directly — don't absorb it silently",
    category: "stakeholders",
    lesson: "infrastructure",
    situation:
      "Mid-project, new feature requests arrived framed as if they had always been part of the plan. Without a clear process, the team was absorbing work without explicit agreement on trade-offs.",
    decision:
      "Implemented a lightweight scope classification: every new request was explicitly categorized as in-scope, deferred to a future phase, or new scope requiring timeline discussion. When a request was scope creep, we named it — respectfully and directly.",
    outcome:
      "Over the build, a double-digit number of feature requests were explicitly classified as 'phase two' — each with a documented reason. Core features shipped on time. No stakeholder was surprised by what wasn't included, because we'd named it early. That's the point: no surprises is better than no scope creep.",
    highlight: "no surprises is better than no scope creep",
    tags: ["scope-creep", "communication", "project-management", "honesty"],
  },
];

export const featuredInsightIds = [12, 22, 3] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Explainer cards — "In Plain English" for non-technical readers
// ─────────────────────────────────────────────────────────────────────────────

export const explainers: ExplainerCard[] = [
  {
    id: "ex-1",
    term: "Serverless & Microservices",
    explanation:
      "Instead of one big application that does everything, we built hundreds of small independent programs — each handling one job. If the payment system gets slammed with traffic, it doesn't slow down the community features. If one part breaks, the rest keep running.",
    appearsAfter: 1,
  },
  {
    id: "ex-2",
    term: "JWT, Bcrypt & Session Revocation",
    explanation:
      "JWT is a secure digital pass that proves who you are. Bcrypt scrambles passwords so even we can't read them. Session revocation means if someone's account gets banned, they're kicked out instantly — across every device, no waiting.",
    appearsAfter: 2,
  },
  {
    id: "ex-7",
    term: "Loki + Grafana",
    explanation:
      "Loki collects all the logs (records of what the system is doing). Grafana turns those logs into visual dashboards — graphs, alerts, real-time status. Together they're like a control room for the entire platform. We host them ourselves instead of paying for expensive cloud services.",
    appearsAfter: 5,
  },
  {
    id: "ex-6",
    term: "Infrastructure as Code",
    explanation:
      "Instead of manually setting up servers by clicking buttons in a dashboard, every server configuration is written as code files. If the server explodes, we run the code and get an identical server back in minutes. It's a recipe book for your entire infrastructure.",
    appearsAfter: 6,
  },
  {
    id: "ex-5",
    term: "CI/CD Pipeline",
    explanation:
      "An automated assembly line for code. Developer writes code → it gets automatically tested → automatically deployed to a test environment → then to production. No manual uploading, no 'works on my machine' surprises.",
    appearsAfter: 7,
  },
  {
    id: "ex-3",
    term: "Edge Middleware",
    explanation:
      "A checkpoint that runs before the website even starts loading. Think of it as a bouncer at the door — if you haven't completed onboarding, you don't get in. Doesn't matter which page you try to visit.",
    appearsAfter: 9,
  },
  {
    id: "ex-4",
    term: "Webhook Lifecycle",
    explanation:
      "When a payment happens, the payment provider sends a message to our server saying 'hey, money arrived.' The webhook lifecycle is everything we do with that message: verify it's real, transform it into our format, handle failures, and update the order. If any step fails, the whole thing retries safely.",
    appearsAfter: 12,
  },
  {
    id: "ex-8",
    term: "Tailwind vs Ant Design vs Material UI",
    explanation:
      "Three different toolkits for building user interfaces. Tailwind gives you full creative control (used for what members see). Ant Design comes with pre-built data tables and forms (used for staff dashboards). Material UI has specific interactive components (used for admin tools). Different jobs, different tools.",
    appearsAfter: 20,
  },
];

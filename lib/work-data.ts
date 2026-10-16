// ─────────────────────────────────────────────────────────────────────────────
// /work — case studies. Add a case here; no component changes needed.
// Facts only. Anything missing is a TODO(oleksii), never a guess.
// ─────────────────────────────────────────────────────────────────────────────

export const WORK_TAGS = [
  "Payments",
  "Fintech",
  "Rescue",
  "CRM",
  "Automation",
] as const;

export type WorkTag = (typeof WORK_TAGS)[number];

export interface Metric {
  /** Display value. A leading number counts up: "8 weeks", "~30k", "$50k+", "2.5 years". */
  value: string;
  label: string;
}

export interface Decision {
  title: string;
  what: string;
  why: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
  /** Grid position, 0-based. */
  col: number;
  row: number;
  /** Column span. */
  w?: number;
  accent?: boolean;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface Diagram {
  title: string;
  cols: number;
  rows: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface Snippet {
  lang: string;
  filename: string;
  caption: string;
  code: string;
}

export interface WorkCase {
  slug: string;
  /** Short number shown on rows and pages, e.g. "01". */
  index: string;
  title: string;
  /** One line. What was wrong or what had to exist. */
  problem: string;
  region: string;
  industry: string;
  period: string;
  duration: string;
  role: string;
  team?: string;
  status?: string;
  tags: WorkTag[];
  stack: string[];
  nda: boolean;
  metrics: Metric[];
  /** True = has a full page at /work/[slug]. False = index row only. */
  full: boolean;
  /** Full cases only. */
  context?: { heading: "What was broken" | "What they needed"; paragraphs: string[] };
  decisions?: Decision[];
  diagram?: Diagram;
  snippet?: Snippet;
  differently?: string[];
  /** Index-only cases: 1–2 extra sentences shown on the row. */
  note?: string;
}

// ── Full cases ───────────────────────────────────────────────────────────────

const ticketing: WorkCase = {
  slug: "ticketing-rescue",
  index: "01",
  title: "Event Ticketing: Payments Rebuilt",
  problem:
    "Stripe wired without payment status tracking. Worked in demos. Would have failed on the first busy on-sale.",
  region: "US",
  industry: "Event ticketing for small and mid-size venues",
  period: "May – Jul 2026",
  duration: "3 months",
  role: "Solution architect, team of one",
  status: "Handed off. Returning Nov 2026.",
  tags: ["Payments", "Fintech", "Rescue"],
  stack: [
    "Go",
    "PostgreSQL",
    "Supabase Auth",
    "Stripe Payment Intents",
    "Stripe Connect",
    "Railway",
    "Redis",
    "Next.js 15",
    "Prometheus",
    "Resend",
  ],
  nda: false,
  metrics: [
    { value: "8 weeks", label: "audit to MVP" },
    { value: "~30k", label: "tickets a year, first venue" },
    { value: "Nov 2026", label: "ticket sales launch" },
  ],
  full: true,
  context: {
    heading: "What was broken",
    paragraphs: [
      "I came in for an audit. The Go codebase worked in demos. Stripe was wired straight into checkout with no payment status on the order: the buyer paid, and the system trusted that the right thing had happened.",
      "Webhook retries were not deduplicated. Stripe retries every event that does not get a 200. Each retry would have created a second set of tickets and sent a second confirmation email.",
      "Refund routes had no tenant checks. Logins were staff or admin with no separation between the two and no venue scoping. Any staff account could refund another venue's order.",
      "No incident had happened yet. The first venue sells about 30k tickets a year, so the first busy on-sale would have been the incident. I had eight weeks to replace the money path before that.",
    ],
  },
  decisions: [
    {
      title: "The order exists before Stripe does",
      what: "POST /payment-intent validates the show, holds a reservation under a CHECK constraint (sold + reserved ≤ capacity), creates the Payment Intent, then writes the order as pending with an expiry. The client gets client_secret, order_id and expires_at. The server owns the clock.",
      why: "The order is the source of truth, not the Stripe callback. If the webhook is late or never arrives, the order is still there in a known state, and the reservation prevents overselling in the meantime.",
    },
    {
      title: "Idempotency at three levels, each with its own key",
      what: "Webhook level: a stripe_events table keyed by event.id, INSERT … ON CONFLICT DO NOTHING. Data level: a unique index on tickets(order_id, ticket_seq), with the whole success path in one transaction. Stripe level: an idempotency key on Payment Intent creation, hashed from reservation, show, email, quantity and total.",
      why: "The stripe_events check is check-then-act without a lock, so a race window exists. Instead of closing it with Redis SETNX, I made the handler safe to replay. If two paths run at once, the second insert fails on the unique index and rolls back. stripe_events became an optimization, not a guarantee. Redis would have added a second source of truth for money and one more thing to fail. A queue was not needed for one instance and tens of orders a day.",
    },
    {
      title: "event.id, not payment_intent.id",
      what: "One Payment Intent produces many events: created, processing, succeeded, payment_failed, canceled. account.updated, payout.failed and charge.dispute.* have no Payment Intent at all. For account and dispute events the handler is last-write-wins by event.created; stale events are acknowledged without a write.",
      why: "Keyed on payment_intent.id, the second legitimate event for the same intent looks like a duplicate and gets dropped.",
    },
    {
      title: "Confirm on read, reconcile daily, sweep every 30 seconds",
      what: "GET /checkout/status asks Stripe directly if the order is still pending and runs the same success handler synchronously. A daily job under an advisory lock finds confirmed orders with no tickets and finishes them. A sweeper releases expired reservations.",
      why: "Webhooks are the main path, not the only path. The buyer on the success page should not wait for a callback, and no order should stay stuck because one event was lost.",
    },
    {
      title: "Tenant checks in the handler, with the trade-off stated",
      what: "Row-level security is written in Postgres, but the Go backend connects with the service role and bypasses it. The effective enforcement: the auth middleware validates the Supabase JWT, every admin route carries venue_id in the path, and the handler checks the profile against venue membership. Nested entities are checked too. A show that belongs to another venue returns 404.",
      why: "A Supabase JWT is not a Postgres role. Making RLS work from Go means a transaction with SET LOCAL on every request and rewriting every policy. For two to five venues that buys a second access model. RLS stays as a second perimeter for the day the admin talks to the database directly. The weak spot: a handler check is something to remember, not an invariant. The path convention and a middleware variant cover it. I would rather name that than hide it.",
    },
    {
      title: "Metrics on the money path before features",
      what: "Prometheus on every money route, seven alert rules, a CI gate that runs migrations up, down and up again, a smoke test script and a runbook for the test-to-live cutover.",
      why: "Failures here are quiet. Nothing crashes when a webhook is dropped. You hear about it from a venue manager. Metrics turn that into an alert.",
    },
  ],
  diagram: {
    title: "Payment path. Two entry points, one transaction.",
    cols: 3,
    rows: 3,
    nodes: [
      { id: "buyer", label: "Buyer", sub: "checkout, Stripe Elements", col: 0, row: 0 },
      { id: "api", label: "POST /payment-intent", sub: "validate · reserve · PI", col: 1, row: 0 },
      { id: "order", label: "Order: pending", sub: "reservation held, expires_at", col: 2, row: 0 },
      { id: "webhook", label: "Webhook", sub: "dedupe by event.id", col: 0, row: 1 },
      { id: "stripe", label: "Stripe", sub: "Payment Intent events", col: 1, row: 1 },
      { id: "status", label: "GET /checkout/status", sub: "confirm on read", col: 2, row: 1 },
      { id: "tx", label: "handlePaymentSuccess", sub: "one tx · unique(order, seq)", col: 1, row: 2, accent: true },
      { id: "sweep", label: "Sweeper · Reconcile", sub: "every 30 s · daily", col: 2, row: 2 },
    ],
    edges: [
      { from: "buyer", to: "api" },
      { from: "api", to: "order" },
      { from: "api", to: "stripe" },
      { from: "stripe", to: "webhook", label: "events, retried" },
      { from: "status", to: "stripe", label: "asks directly", dashed: true },
      { from: "order", to: "status", label: "success page", dashed: true },
      { from: "webhook", to: "tx" },
      { from: "status", to: "tx" },
      { from: "sweep", to: "tx", label: "finishes stuck orders", dashed: true },
    ],
  },
  snippet: {
    lang: "go",
    filename: "payments/webhook.go",
    caption:
      "Reconstructed from the production handler. Names are generic, the structure is the real one.",
    code: `// Cheap dedupe first. The real guarantee is below, in the transaction.
func (h *Handler) HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	event, err := webhook.ConstructEvent(body, sig, h.webhookSecret)
	if err != nil {
		http.Error(w, "bad signature", http.StatusBadRequest)
		return
	}

	seen, err := h.store.IsStripeEventProcessed(ctx, event.ID)
	if err == nil && seen {
		w.WriteHeader(http.StatusOK) // already handled, ack and exit
		return
	}
	// On a read error we keep going. A duplicate is safe. A lost event is not.

	if err := h.process(ctx, event); err != nil {
		h.store.MarkStripeEventFailed(ctx, event.ID, err)
		http.Error(w, "retry", http.StatusInternalServerError) // Stripe retries
		return
	}
	h.store.MarkStripeEventProcessed(ctx, event.ID) // INSERT … ON CONFLICT (id) DO NOTHING
	w.WriteHeader(http.StatusOK)
}

// One transaction. If a second path races us, the unique index on
// tickets(order_id, ticket_seq) fails the insert and the whole tx rolls back.
func (h *Handler) handlePaymentSuccess(ctx context.Context, pi *stripe.PaymentIntent) error {
	return h.db.Tx(ctx, func(tx *sql.Tx) error {
		order, err := q.LockOrderByPaymentIntent(tx, pi.ID)
		if err != nil {
			return err
		}
		if order.Status == "confirmed" {
			return nil // replay, nothing to do
		}
		if err := q.SetOrderStatus(tx, order.ID, "confirmed"); err != nil {
			return err
		}
		if err := q.ConsumeReservation(tx, order.ReservationID); err != nil {
			return err
		}
		for seq := 1; seq <= order.Quantity; seq++ {
			if err := q.InsertTicket(tx, order.ID, seq, newValidationCode()); err != nil {
				return err // unique violation: the other path won
			}
		}
		return q.AuditPaymentConfirmed(tx, order.ID, pi.ID)
	})
	// The caller sends the email after commit. Never inside the transaction.
}`,
  },
  differently: [
    "Go fits a single-binary money path. I would still think twice before choosing it for a bigger product.",
    "The buyer checkout is still Create React App. It is logged as debt in the proposal and it is the first thing I replace in November.",
    "Order status transitions are strings set in several places. A transition table would make the state machine an invariant instead of a convention.",
  ],
};

const membership: WorkCase = {
  slug: "membership-platform",
  index: "02",
  title: "Membership Platform, California",
  problem:
    "A community organization with nothing digital. Membership, payments, store, events and delivery had to exist in three months.",
  region: "California, US",
  industry: "Community organization, non-profit",
  period: "Late 2024 – present",
  duration: "~2 years, ongoing",
  role: "Developer → team lead → head of all technology",
  team: "7 engineers at peak, 9 at most. 18 people across the digital program.",
  status: "In production.",
  tags: ["Payments", "Automation"],
  stack: [
    "Next.js",
    "React",
    "Node.js",
    "Express",
    "PostgreSQL",
    "Supabase",
    "Vercel",
    "Python",
    "Lightspeed POS",
  ],
  nda: true,
  metrics: [
    { value: "3 months", label: "idea to production" },
    { value: "3k+", label: "monthly members" },
    { value: "$50k+", label: "monthly store turnover" },
  ],
  full: true,
  context: {
    heading: "What they needed",
    paragraphs: [
      "Nothing existed. No member database, no events system, no store that worked. There was a store SaaS. It was bad enough that we rewrote it rather than integrate it.",
      "The organization knew from day one this was a large program: membership tiers, payments, a store, events, a community space, and delivery for members who cannot come in person. Later a print production line with its own hardware joined the platform.",
      "I joined as a developer at the end of 2024. By the time the first version shipped I was leading the dev team. Today I run all of the technology.",
    ],
  },
  decisions: [
    {
      title: "Membership is a gate, not a label",
      what: "A non-member gets nothing. The funnel ends with a physical member card, issued in person after a document check. No KYC vendor.",
      why: "We looked at building KYC and at buying it. For this community a person at a desk checking a driver's license is cheaper, faster and more trusted than any API. The software's job is to make that desk the only way in.",
    },
    {
      title: "One classic stack, no experiments",
      what: "Next.js and React on Vercel, Node and Express for services, Postgres on Supabase, Python for anything that needed a script. I wanted Vue at the time. We did not pick Vue.",
      why: "I was not ready to run commercial development on a framework I was still learning, and hiring would have been harder. The hire that mattered most was a front-end engineer, because front-end is the work I do slowest.",
    },
    {
      title: "Hire DevOps early, let him leave early",
      what: "Four months of a very strong DevOps engineer set up environments, deploys and monitoring. He consults for us now.",
      why: "The platform would not have shipped in three months without that work. It also did not need a full-time DevOps engineer once it was done.",
    },
    {
      title: "Integrate the point of sale, do not replace it",
      what: "The store runs on our platform. Lightspeed POS is integrated for in-person sales and inventory. Payments go through several third-party APIs and our own crypto bridge.",
      why: "Replacing POS hardware across locations was not where the value was. Inventory and member identity were.",
    },
    {
      title: "Keep the monolithic admin",
      what: "The admin panel is large, heavy and collects a lot of operational statistics. It breaks occasionally. I am the only one who works on it.",
      why: "Rewriting it costs more than maintaining it, and it does everything it was asked to do. Members never see it. Admin downtime is an inconvenience, not an incident.",
    },
  ],
  diagram: {
    title: "Four product lines, one member identity.",
    cols: 3,
    rows: 3,
    nodes: [
      { id: "member", label: "Member", sub: "card issued in person", col: 0, row: 0 },
      { id: "platform", label: "Platform", sub: "tiers · events · community", col: 1, row: 0, accent: true },
      { id: "admin", label: "Admin", sub: "ops · statistics · payroll", col: 2, row: 0 },
      { id: "store", label: "Store", sub: "online + Lightspeed POS", col: 0, row: 1 },
      { id: "db", label: "Postgres", sub: "one member record", col: 1, row: 1 },
      { id: "delivery", label: "Delivery", sub: "members who can't come in", col: 2, row: 1 },
      { id: "pay", label: "Payments", sub: "3rd-party APIs · crypto", col: 0, row: 2 },
      { id: "print", label: "Print line", sub: "own hardware", col: 2, row: 2 },
    ],
    edges: [
      { from: "member", to: "platform" },
      { from: "platform", to: "db" },
      { from: "admin", to: "db" },
      { from: "store", to: "db" },
      { from: "delivery", to: "db" },
      { from: "store", to: "pay" },
      { from: "print", to: "db", dashed: true },
    ],
  },
  differently: [
    "Supabase. The platform needs plain Postgres that we operate. We should have left as soon as it was possible.",
    "Vercel is fine. The next step is our own infrastructure, and early decisions make that move harder than it should be.",
    "Staff payroll calculation broke several times: bonuses, staff loans, staff prices, per-person rates, and automatic time logging that depended on people clocking out. It should have been a separate, boring service from the start.",
  ],
};

const cryptoCard: WorkCase = {
  slug: "crypto-card",
  index: "03",
  title: "Crypto-to-Card Platform",
  problem:
    "Users load crypto and spend it through virtual cards. The backend had to exist first: KYC, compliance, transactions, card issuance.",
  region: "Region withheld",
  industry: "Fintech, consumer payments",
  period: "2024 – 2025",
  duration: "~1 year",
  role: "Backend engineer, finance → tech lead, backend",
  team: "1–2 front-end engineers, QA. No DevOps.",
  status: "Handed off.",
  tags: ["Fintech", "Payments"],
  stack: ["Node.js", "C#", "Rust", "Python", "Telegram Bot API", "Telegram Wallet"],
  nda: false,
  metrics: [
    { value: "5 months", label: "zero to live" },
    { value: "300", label: "users at launch" },
    { value: "2k", label: "transactions a month at launch" },
  ],
  full: true,
  context: {
    heading: "What they needed",
    paragraphs: [
      "A payment backend from zero. Users deposit crypto, it becomes a balance, the balance is spent through a virtual card. Around that: a KYC flow, compliance checks, transaction processing and integration with more than one card issuer.",
      "I joined as the backend engineer responsible for finance. When the other backend engineer left, I became tech lead for the backend. There was no DevOps. I wrote the deploy configs myself.",
      "Details of the compliance and KYC setup stay with the client. What follows is the part I can talk about.",
    ],
  },
  decisions: [
    {
      title: "Transactions and reconciliation first, everything else on top",
      what: "Deposits, balance changes and card transactions were built and reconciled against the issuer before anything user-facing got attention.",
      why: "At the time I understood money better than I understood architecture. I spent the design budget on the one part where a mistake cannot be undone.",
    },
    {
      title: "Move custody to Telegram Wallet",
      what: "We started with our own custody and a deposit provider. Deposits got stuck at the provider. When Telegram Wallet became viable we moved deposits there.",
      why: "Stuck deposits disappeared with the move. Custody is a liability. The fewer places money waits, the fewer support tickets you own.",
    },
    {
      title: "The card lives inside Telegram too",
      what: "A Python bot lets a user top up and move money without leaving Telegram.",
      why: "That is where the users already were.",
    },
    {
      title: "Double-spends happened. They got fixed.",
      what: "Early on, concurrent requests could spend the same balance twice. We found it, fixed it, and added the test.",
      why: "It is the one bug in a money system that costs real money every time it fires. Since then it is the first thing I test on any money path, before any feature.",
    },
  ],
  diagram: {
    title: "Crypto in, card out.",
    cols: 3,
    rows: 3,
    nodes: [
      { id: "deposit", label: "Crypto deposit", sub: "own custody → TG Wallet", col: 0, row: 0 },
      { id: "kyc", label: "KYC · compliance", sub: "gate, details withheld", col: 1, row: 0 },
      { id: "bot", label: "Telegram bot", sub: "top up · transfer", col: 2, row: 0 },
      { id: "ledger", label: "Balance · transactions", sub: "single write path", col: 1, row: 1, accent: true },
      { id: "issuer", label: "Card issuers", sub: "more than one", col: 1, row: 2 },
      { id: "card", label: "Virtual card", sub: "authorizations", col: 2, row: 2 },
    ],
    edges: [
      { from: "deposit", to: "ledger" },
      { from: "kyc", to: "ledger" },
      { from: "bot", to: "ledger" },
      { from: "ledger", to: "issuer" },
      { from: "issuer", to: "card" },
      { from: "card", to: "ledger", label: "reconcile", dashed: true },
    ],
  },
  differently: [
    "Custody. Start with a wallet provider instead of running our own.",
    "This was before I understood architecture the way I do now. The money logic held. The structure around it would look different today.",
  ],
};

const proptech: WorkCase = {
  slug: "proptech-crm",
  index: "04",
  title: "Real Estate CRM, Limassol",
  problem:
    "About 80 agents ran the busiest agency in the city on ten Telegram groups and a set of spreadsheets.",
  region: "Limassol, Cyprus",
  industry: "Real estate agency, premium rentals and sales",
  period: "2022 – 2024",
  duration: "2.5 years",
  role: "Tech lead",
  team: "2 junior developers",
  status: "Handed off.",
  tags: ["CRM", "Automation"],
  stack: ["Python", "Django", "MongoDB", "Telegram Bot API", "OpenAI GPT-3.5 / 4", "AWS"],
  nda: false,
  metrics: [
    { value: "80", label: "agents off Telegram" },
    { value: "~1 hour", label: "lead response, from about half a day" },
    { value: "2.5 years", label: "in production" },
  ],
  full: true,
  context: {
    heading: "What was broken",
    paragraphs: [
      "The agency was the busiest in Limassol. Its operating system was ten Telegram groups and Google Sheets. The founder posted listings into each group by hand and collected replies by hand.",
      "A lead that came in at noon got an answer in the evening, when an agent finally scrolled back through the group. Repeat clients were not recognized. Nobody knew the history of a property.",
      "The segment was premium rentals, sales and offices. Each property carried a lot of information and a lot of conversation. All of it lived in chats.",
    ],
  },
  decisions: [
    {
      title: "Build native instead of buying a CRM",
      what: "Django, Mongo, Python bots. A CRM with lead history, property history, who is working which property, and competitor tracking.",
      why: "The founder needed dozens of small features that off-the-shelf CRMs either did not have or sold in their most expensive tier. Every micro-feature became one more reason to own the code.",
    },
    {
      title: "The bot picks when to post",
      what: "An agent adds a listing to a queue. The bot chooses the time window and posts to the agency's own Telegram groups. Spam, competitor and scraper protection on the groups came with it.",
      why: "Posting by hand was the founder's full-time job. The groups grew once the timing became consistent.",
    },
    {
      title: "An auto-responder that chooses, not writes",
      what: "First-line answers in the groups came from an algorithmic responder with GPT-3.5, later GPT-4, choosing between prepared answers.",
      why: "Most first questions are the same. The model only had to pick, so it could not make promises.",
    },
    {
      title: "Parse the listings portal, do not retype it",
      what: "A parser for Bazaraki, the main local portal, with bot protection on the other side. It was the hardest scraping I had done at that point.",
      why: "A new listing had to be in the CRM minutes after it appeared on the market. That is the whole business.",
    },
    {
      title: "Follow the agents to the phone",
      what: "Once bots handled selection and posting, agents' work became calls. Calls were recorded, attached to leads and reviewed by managers.",
      why: "The CRM has to live where the work is. The work moved.",
    },
  ],
  diagram: {
    title: "Listings in, leads out, everything logged.",
    cols: 3,
    rows: 3,
    nodes: [
      { id: "portal", label: "Listings portal", sub: "Bazaraki", col: 0, row: 0 },
      { id: "parser", label: "Parser", sub: "new listings in minutes", col: 1, row: 0 },
      { id: "crm", label: "CRM", sub: "lead + property history", col: 1, row: 1, accent: true },
      { id: "agents", label: "80 agents", sub: "one interface", col: 2, row: 1 },
      { id: "poster", label: "Posting bot", sub: "picks the time window", col: 0, row: 1 },
      { id: "groups", label: "Telegram groups", sub: "own, protected", col: 0, row: 2 },
      { id: "responder", label: "Auto-responder", sub: "GPT picks a prepared answer", col: 1, row: 2 },
      { id: "calls", label: "Calls", sub: "recorded, attached to leads", col: 2, row: 2 },
    ],
    edges: [
      { from: "portal", to: "parser" },
      { from: "parser", to: "crm" },
      { from: "crm", to: "poster" },
      { from: "poster", to: "groups" },
      { from: "groups", to: "responder", label: "leads" },
      { from: "responder", to: "crm" },
      { from: "crm", to: "agents" },
      { from: "agents", to: "calls" },
      { from: "calls", to: "crm", dashed: true },
    ],
  },
  differently: [
    "Define the support boundary in the contract before the first line of code. Years of small post-handoff requests are a contract problem, not a code problem.",
  ],
};

// ── Index-only cases ─────────────────────────────────────────────────────────

const agritech: WorkCase = {
  slug: "agritech-farm-ops",
  index: "05",
  title: "Farm Operations, Ukraine",
  problem:
    "Several farm locations logging shifts, fuel and GPS by hand, during a war in which GPS gets jammed.",
  note: "Drivers used a Telegram bot: two taps to open and close a shift, field search by buttons, no login. When GPS was jammed the system fell back to driver input. Payroll and bonuses were calculated from the same data.",
  region: "Ukraine",
  industry: "Agriculture",
  period: "TODO(oleksii): years",
  duration: "",
  role: "TODO(oleksii): role",
  tags: ["Automation"],
  stack: ["Telegram Bot API", "GPS trackers"],
  nda: false,
  metrics: [
    { value: "GPS + fuel", label: "per vehicle, live" },
    { value: "Payroll", label: "from shift data" },
    { value: "Multi-site", label: "one system" },
  ],
  full: false,
};

const govtech: WorkCase = {
  slug: "procurement-analytics",
  index: "06",
  title: "Procurement Analytics, Prozorro",
  problem:
    "Find contractors linked to the companies ordering from them, across the national procurement history.",
  note: "Every tender, auction and bid from the Prozorro API, cross-referenced. Storage grew from 1 TB to 16 TB. Built for a media investigation, used by media, NGOs and business.",
  region: "Ukraine",
  industry: "GovTech, public data",
  period: "2021 – 2023",
  duration: "",
  role: "Solo developer",
  tags: [],
  stack: ["Prozorro API", "PostgreSQL"],
  nda: false,
  metrics: [
    { value: "Millions", label: "of records" },
    { value: "1 → 16 TB", label: "storage" },
    { value: "National", label: "scale" },
  ],
  full: false,
};

const edtech: WorkCase = {
  slug: "university-rankings",
  index: "07",
  title: "University Rankings, Forbes Ukraine",
  problem:
    "Rank the top 400 universities on admission exam data and conversion into master's programs.",
  note: "Full Python pipeline: collection, scoring, dashboards. Published by Forbes Ukraine.",
  region: "Ukraine",
  industry: "EdTech, data",
  period: "TODO(oleksii): 2020 or 2021",
  duration: "",
  role: "Solo developer",
  tags: [],
  stack: ["Python"],
  nda: false,
  metrics: [
    { value: "400", label: "universities" },
    { value: "Python", label: "end to end" },
    { value: "Published", label: "Forbes Ukraine" },
  ],
  full: false,
};

const bots: WorkCase = {
  slug: "telegram-bots",
  index: "08",
  title: "20+ Telegram Bots",
  problem:
    "From downloaders and game bots to lead funnels and daily digests for marketing teams.",
  note: "Some of the first Telegram mini-apps. Survey bots, a tarot bot, a bot that put a client's site admin panels inside Telegram. Clients in Ukraine, UAE, Greece, Cyprus, France, Germany, Denmark, UK, US, Kazakhstan, Georgia and Azerbaijan.",
  region: "12 countries",
  industry: "Multiple",
  period: "2018 – present",
  duration: "",
  role: "Solo developer",
  tags: ["Automation"],
  stack: ["Python", "Node.js", "Telegram Bot API"],
  nda: false,
  metrics: [
    { value: "20+", label: "bots shipped" },
    { value: "12", label: "countries" },
    { value: "Mini-apps", label: "among the first" },
  ],
  full: false,
};

// ── Exports ──────────────────────────────────────────────────────────────────

export const workCases: WorkCase[] = [
  ticketing,
  membership,
  cryptoCard,
  proptech,
  agritech,
  govtech,
  edtech,
  bots,
];

export const fullCases = workCases.filter((c) => c.full);
export const shortCases = workCases.filter((c) => !c.full);

export function getCase(slug: string): WorkCase | undefined {
  return fullCases.find((c) => c.slug === slug);
}

export function adjacentCases(slug: string): { prev?: WorkCase; next?: WorkCase } {
  const i = fullCases.findIndex((c) => c.slug === slug);
  if (i === -1) return {};
  return {
    prev: fullCases[(i - 1 + fullCases.length) % fullCases.length],
    next: fullCases[(i + 1) % fullCases.length],
  };
}

export function isWorkTag(value: string): value is WorkTag {
  return (WORK_TAGS as readonly string[]).includes(value);
}

export function filterByTag(tag?: WorkTag): WorkCase[] {
  if (!tag) return workCases;
  return workCases.filter((c) => c.tags.includes(tag));
}

/** Where the home page sends people from "Clients from". */
export const workRegions = ["US", "Cyprus", "Ukraine", "UAE", "Germany", "UK"];

// ─────────────────────────────────────────────────────────────────────────────
// Part 5 — the audit report. The findings, ranked.
//
// Most of these are the same bugs the earlier Parts take apart, gathered into
// one real (deliberately broken) client cabinet. `chapter` points back to where
// a Part already reproduces it; `show` names the live reproduction in the report
// itself. Client-safe: no server imports, so the report page and the demos share it.
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITY: Record<Severity, { label: string; bg: string; ink: string; rank: number }> = {
  critical: { label: "Critical", bg: "#FF3B3B", ink: "#FFFDF5", rank: 0 },
  high: { label: "High", bg: "#FF8A3D", ink: "#000", rank: 1 },
  medium: { label: "Medium", bg: "#FFE600", ink: "#000", rank: 2 },
  low: { label: "Low", bg: "#C6FF3D", ink: "#000", rank: 3 },
};

/** How the report reproduces a finding. Inline demos run against the broken cabinet. */
export type Show =
  | { kind: "inline"; action: "config" | "invoice" | "webhook" | "pay" | "float" | "ratelimit" | "restore" | "logs" | "deploy" }
  | { kind: "chapter"; href: string };

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  /** What's wrong, one line, plain language. */
  whatTech: string;
  whatPlain: string;
  /** What it means for Northwind, concrete, straight from the canon. */
  soWhat: string;
  /** The fix, one sentence. */
  fix: string;
  /** A chapter from Parts 1–4 that takes this apart, if one does. */
  chapter?: { n: string; href: string; label: string };
  show: Show;
}

export const FINDINGS: Finding[] = [
  {
    id: "db-key",
    severity: "critical",
    title: "The database key is in the browser",
    whatTech: "A key with full rights to the database ships inside the page's JavaScript, where anyone can read it.",
    whatPlain: "The master key to the whole database is sitting in the web page, where any visitor can copy it.",
    soWhat: "With that key, anyone reads and changes every client's invoices and files directly, not just their own. The login in front of it stops nothing.",
    fix: "Keep the full-rights key on the server; give the browser a key scoped to the logged-in client, or no key at all.",
    chapter: { n: "4.1", href: "/lab/privacy/someone-elses-files", label: "Someone Else's Files" },
    show: { kind: "inline", action: "config" },
  },
  {
    id: "invoice-idor",
    severity: "critical",
    title: "Change the number, read someone else's invoice",
    whatTech: "The invoice page checks you're logged in, not that the invoice is yours. Change the number in the address and another client's invoice opens.",
    whatPlain: "To see an invoice the cabinet only checks that you're logged in. Change one number in the address and you're looking at another client's invoice.",
    soWhat: "Logged in as Brightlane, change the number and Kestrel Analytics' invoice opens: amount, plan, payment status. Nothing was hacked.",
    fix: "Check the invoice belongs to the logged-in client, and let the database refuse the rest even if a page forgets.",
    chapter: { n: "4.1", href: "/lab/privacy/someone-elses-files", label: "Someone Else's Files" },
    show: { kind: "inline", action: "invoice" },
  },
  {
    id: "webhook-unsigned",
    severity: "critical",
    title: "A forged message marks an invoice paid",
    whatTech: "The payment webhook isn't checked for a signature. Any POST that says “paid” is believed.",
    whatPlain: "When the payment company says an invoice is paid, the cabinet doesn't check the message is really from them. A faked message works just as well.",
    soWhat: "A €5,800 invoice flips to paid with no money behind it. The studio ships the work, then finds the money never arrived.",
    fix: "Verify the provider's signature over the raw body before acting, and ignore anything that fails.",
    chapter: { n: "2.3", href: "/lab/money/webhooks", label: "Webhooks" },
    show: { kind: "inline", action: "webhook" },
  },
  {
    id: "double-pay",
    severity: "high",
    title: "Double-tap Pay, charged twice",
    whatTech: "Pay has no idempotency key. A second click, a retry or a flaky network creates a second charge.",
    whatPlain: "If you tap Pay twice, or your phone retries, you're charged twice for the same invoice.",
    soWhat: "The €5,800 Studio retainer comes out of a client's account twice. They notice before the studio does.",
    fix: "Carry one idempotency key per payment all the way to a unique constraint in the database.",
    chapter: { n: "2.2", href: "/lab/money/idempotency", label: "Idempotency" },
    show: { kind: "inline", action: "pay" },
  },
  {
    id: "bot-reads-all",
    severity: "high",
    title: "The cabinet bot reads every client's files",
    whatTech: "The support bot searches all 140 files for every question, then hides the sources it shouldn't show.",
    whatPlain: "The help bot reads every client's files to answer anyone. It just hides where the answer came from.",
    soWhat: "A client asks about their own project and the answer quotes Tidepool's confidential file. Tidepool signed a confidentiality clause.",
    fix: "Search only the files that client may open, so the bot never reads the rest.",
    chapter: { n: "4.2", href: "/lab/privacy/bot-knows-too-much", label: "The Bot Knows Too Much" },
    show: { kind: "chapter", href: "/lab/privacy/bot-knows-too-much" },
  },
  {
    id: "float-cents",
    severity: "high",
    title: "Money is stored as a decimal that drifts",
    whatTech: "Amounts are floating-point numbers. Split a bill and the halves no longer add back to the total.",
    whatPlain: "Money is kept as the kind of number that can't hold exact cents. Split a bill in two and a cent goes missing.",
    soWhat: "Split invoices and partial payments stop adding up. By month end the books and the bank disagree, and nobody can say why.",
    fix: "Store money as whole cents in integers; split with a method that assigns the leftover cent on purpose.",
    chapter: { n: "2.6", href: "/lab/money/money-math", label: "Money Math" },
    show: { kind: "inline", action: "float" },
  },
  {
    id: "pii-to-ai",
    severity: "medium",
    title: "Personal data in briefs goes to the AI",
    whatTech: "Whatever is in a brief is sent to the model verbatim, including personal data a client pasted by mistake.",
    whatPlain: "Anything a client puts in a brief is sent to the AI as-is, even personal details they shouldn't have shared.",
    soWhat: "Halden's brief has patient records in it. They leave the building for a third-party model with the rest of the text.",
    fix: "Swap personal data for placeholders before sending, and put it back only for the person reading the answer.",
    chapter: { n: "4.4", href: "/lab/privacy/what-leaves", label: "What Leaves for the AI" },
    show: { kind: "chapter", href: "/lab/privacy/what-leaves" },
  },
  {
    id: "eternal-links",
    severity: "medium",
    title: "File links never expire",
    whatTech: "Share links are public and permanent; they keep working after the project and the person are gone.",
    whatPlain: "A link to a file works forever, for anyone who has it, long after the project ends.",
    soWhat: "The freelancer who rebuilt the cabinet still has links to a finished project's files. They open fine today.",
    fix: "Sign links, expire them in minutes, bind them to one person, and kill them when access is revoked.",
    chapter: { n: "4.6", href: "/lab/privacy/link-that-never-dies", label: "The Link That Never Dies" },
    show: { kind: "chapter", href: "/lab/privacy/link-that-never-dies" },
  },
  {
    id: "no-rate-limits",
    severity: "medium",
    title: "No limit on logins or bot questions",
    whatTech: "The login and the bot take unlimited requests. Passwords can be guessed at full speed; the bot can be run up a bill.",
    whatPlain: "Nothing stops someone trying thousands of passwords, or asking the bot so many questions it runs up a bill.",
    soWhat: "One client account is one guessed password away from the invoices behind it, and the AI bill has no ceiling.",
    fix: "Count attempts per account and per address, slow them down after a few, and cap the bot's spend.",
    show: { kind: "inline", action: "ratelimit" },
  },
  {
    id: "untested-restore",
    severity: "medium",
    title: "Backups run, restore was never tested",
    whatTech: "Nightly backups exist, but no one has ever restored one. The dump is there; whether it comes back is unknown.",
    whatPlain: "The cabinet is backed up every night, but nobody has ever checked that a backup can actually be put back.",
    soWhat: "The one morning the database is lost, the studio finds out whether the backups work. A backup you can't restore is a file, not a backup.",
    fix: "Restore a backup into a scratch database on a schedule and check row counts; a backup is only real once it's been put back.",
    show: { kind: "inline", action: "restore" },
  },
  {
    id: "secrets-logs",
    severity: "low",
    title: "Secrets printed to the logs",
    whatTech: "Keys and tokens are logged in plain text. Anyone with log access reads them.",
    whatPlain: "The cabinet writes its passwords and keys into its logs, where more people can see them than should.",
    soWhat: "The secrets you'd rotate after a breach are already sitting in the log history, waiting to be read.",
    fix: "Keep secrets out of logs; redact known key shapes before anything is written.",
    show: { kind: "inline", action: "logs" },
  },
  {
    id: "no-staging",
    severity: "low",
    title: "No staging, deploys from a laptop",
    whatTech: "There is one environment: production. Releases go straight from a laptop, untested, nothing to roll back to.",
    whatPlain: "There's only the live site. New versions go straight onto it from someone's laptop, with nowhere to test first.",
    soWhat: "Every change is tried for the first time on real clients. A bad release is live until someone's laptop fixes it.",
    fix: "Add a staging copy, deploy from a pipeline, and keep the last good release to roll back to.",
    show: { kind: "inline", action: "deploy" },
  },
];

export const bySeverity = (s: Severity) => FINDINGS.filter((f) => f.severity === s);

/** 3 / 3 / 4 / 2 for the black panel. */
export const COUNTS: Record<Severity, number> = {
  critical: bySeverity("critical").length,
  high: bySeverity("high").length,
  medium: bySeverity("medium").length,
  low: bySeverity("low").length,
};

/** How many findings a Part already takes apart in full. */
export const COVERED = FINDINGS.filter((f) => f.chapter).length;
export const NEW = FINDINGS.length - COVERED;

// ─────────────────────────────────────────────────────────────────────────────
// Audit Lab (Part 5) — chapter registry. One entry per /lab/audit/<slug>.
// Same shape and rules as lib/privacy-lab.ts: drafts are not listed and 404,
// unless LAB_SHOW_DRAFTS=1 locally.
// ─────────────────────────────────────────────────────────────────────────────

import { showDrafts } from "./lab-config";
import type { MoneyModule } from "./money-lab";

export type AuditChapter = MoneyModule;

// TODO(oleksii): wording of every chapter.
export const auditChapters: AuditChapter[] = [
  {
    slug: "report",
    kicker: "Part 5 · The report",
    plainKicker: "Part 5 · The report",
    title: "The Report",
    proves:
      "The whole audit on one page: what I checked, how long it took, and every finding ranked Critical to Low. Each one says what breaks for Northwind, and a button reproduces it live on the broken cabinet.",
    plain:
      "The whole audit on one page: what I checked, how long it took, and every problem ranked by how bad it is. Each one says what it means for Northwind, and a button shows it happening for real.",
    counters: [
      { key: "p5_shows", label: "Findings reproduced live", plain: "Problems shown happening" },
      { key: "p5_forged_paid", label: "Forged payments the cabinet accepted", plain: "Fake payments it believed" },
    ],
    color: "#FF8A3D",
    status: "draft",
  },
  {
    slug: "five-days",
    kicker: "Part 5 · The week",
    plainKicker: "Part 5 · The week",
    title: "Five Days",
    proves:
      "How the audit actually ran, day by day: access and a map of the system, then money, then the AI and the data, then the infrastructure, then the report. What the tools found on their own, and what only reading the code found.",
    plain:
      "How the week actually went, day by day: getting in and mapping the system, then the money, then the AI and the data, then the servers and backups, then writing it up. What the automatic tools caught, and what only reading the code by hand caught.",
    counters: [{ key: "p5_shows", label: "Findings reproduced live", plain: "Problems shown happening" }],
    color: "#6EC1FF",
    status: "draft",
  },
  {
    slug: "after",
    kicker: "Part 5 · After",
    plainKicker: "Part 5 · After",
    title: "After the Report",
    proves:
      "The fixes, in the order they went in and why: criticals first. How long each one actually took, measured on the same broken cabinet. The same “Show me” buttons, run against the fixed version, find nothing.",
    plain:
      "What happened after the report: the fixes, worst first, and why that order. How long each one really took. The same buttons, run on the fixed version, now come up empty.",
    counters: [{ key: "p5_fixed_shows", label: "Findings left on the fixed cabinet", plain: "Problems left after the fixes" }],
    color: "#C6FF3D",
    status: "draft",
  },
];

export const liveChapters = auditChapters.filter((c) => c.status === "live" || showDrafts);

/** Per visitor per hour. One bucket for every reproduction button in the report. */
export const auditLimits = { showsPerHour: 120 } as const;

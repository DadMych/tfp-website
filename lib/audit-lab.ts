// ─────────────────────────────────────────────────────────────────────────────
// Audit Lab (Part 5) — chapter registry. One entry per /lab/audit/<slug>.
// Same shape and rules as lib/privacy-lab.ts: drafts are not listed and 404,
// unless LAB_SHOW_DRAFTS=1 locally.
// ─────────────────────────────────────────────────────────────────────────────

import { showDrafts } from "./lab-config";
import type { MoneyModule } from "./money-lab";

export type AuditChapter = MoneyModule;

// Part 5 is one interactive page at /lab/audit ("Launch anyway"). The report is
// the one sub-page that remains — the full written deliverable, linked from the
// page, the rewind and /review. The old 5.2/5.3 chapters redirect to /lab/audit.
// TODO(oleksii): wording.
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
    status: "live",
  },
];

export const liveChapters = auditChapters.filter((c) => c.status === "live" || showDrafts);

/** Per visitor per hour. One bucket for every reproduction button in the report. */
export const auditLimits = { showsPerHour: 120 } as const;

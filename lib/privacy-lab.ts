// ─────────────────────────────────────────────────────────────────────────────
// Privacy Lab (Part 4) — chapter registry. One entry per /lab/privacy/<slug>.
// Same shape and rules as lib/web3-lab.ts: drafts are not listed and 404,
// unless LAB_SHOW_DRAFTS=1 locally.
// ─────────────────────────────────────────────────────────────────────────────

import { showDrafts } from "./lab-config";
import type { MoneyModule } from "./money-lab";

export type PrivacyChapter = MoneyModule;

// TODO(oleksii): wording of every chapter.
export const privacyChapters: PrivacyChapter[] = [
  {
    slug: "someone-elses-files",
    kicker: "Part 4 · Isolation",
    title: "Someone Else's Files",
    proves:
      "Logged in as Brightlane, change the project number in the address and Kestrel's files open. One portal checks only that you're logged in. The other checks the file is yours, and the database itself drops everyone else's rows.",
    plain:
      "Logged in as one client, change a number in the address and another client's files open. One portal only checks that you're logged in. The other checks the file is yours, and the database refuses to hand over anyone else's.",
    caseSlug: "ticketing-rescue",
    caseLabel: "Ticketing: row-level security, bypassed by the service key",
    counters: [
      { key: "p4_iso_tries", label: "Addresses opened", plain: "Addresses tried" },
      { key: "p4_iso_careless_files", label: "Other clients' files shown", plain: "Someone else's files shown" },
    ],
    color: "#6EC1FF",
    status: "live",
  },
  {
    slug: "bot-knows-too-much",
    kicker: "Part 4 · Retrieval",
    title: "The Bot Knows Too Much",
    proves:
      "A client asks the Part 1 bot about their own project, and it quotes a confidential Tidepool file. One build searches every file and hides the sources afterwards. The other searches only the files that client may open, so the AI never reads the rest.",
    plain:
      "A client asks the support bot a simple question, and it answers with another client's confidential file. One version reads everything and hides where it got it from. The other only reads what that client is allowed to see.",
    counters: [
      { key: "p4_asks", label: "Questions asked both ways", plain: "Questions asked" },
      { key: "p4_careless_leaks", label: "Answers citing a file the client can't open", plain: "Answers from someone else's file" },
    ],
    color: "#FFD23F",
    status: "live",
  },
  {
    slug: "deleted-but-remembers",
    kicker: "Part 4 · Deletion",
    title: "Deleted, But It Remembers",
    proves:
      "Halden asks for its files to be deleted. The file leaves the folder, but its pieces stay in the search index and the bot keeps quoting it. One build deletes the file. The other deletes the file, its pieces and every cached answer.",
    plain:
      "A client asks you to delete their files. The file is gone from the folder, but the bot still quotes it. One version deletes the file. The other deletes everything the bot kept from it too.",
    counters: [{ key: "p4_deleted_resurfaced", label: "Answers from a deleted file", plain: "Deleted, still quoted" }],
    color: "#FF8A3D",
    status: "live",
  },
  {
    slug: "what-leaves",
    kicker: "Part 4 · Redaction",
    title: "What Leaves for the AI",
    proves:
      "Halden's brief has test patient records in it: names, birth dates, diagnoses, all made up and labelled. See exactly what goes to the model. One build sends it all. The other swaps the personal data out before sending and puts it back only for the person reading.",
    plain:
      "A client's brief has patient details in it by mistake. See exactly what gets sent to the AI. One version sends everything. The other hides the personal details first and only shows them again to the person reading the answer.",
    counters: [
      { key: "p4_redact_asks", label: "Tasks run both ways", plain: "Tasks tried" },
      { key: "p4_redact_sent", label: "Patient details the careless build sent", plain: "Patient details sent to the AI" },
    ],
    color: "#C6FF3D",
    status: "live",
  },
  {
    slug: "who-looked",
    kicker: "Part 4 · Audit log",
    title: "Who Looked?",
    proves:
      "Tidepool asks who opened their contract last month. One log can be quietly edited and never records the bot reading the file. The other only grows, each entry is chained to the one before, and an edit breaks the chain where anyone can see.",
    plain:
      "A client asks who opened their contract last month. One record can be changed without a trace, and doesn't count the bot reading it. The other can only be added to, and any change shows.",
    counters: [
      { key: "p4_audit_tampers", label: "Entries hidden with the owner key", plain: "Entries hidden" },
      { key: "p4_audit_caught", label: "Caught by the chain", plain: "Caught" },
    ],
    color: "#B79CFF",
    status: "live",
  },
  {
    slug: "link-that-never-dies",
    kicker: "Part 4 · Links",
    title: "The Link That Never Dies",
    proves:
      "The freelancer's project is over and their access is gone, but an old Harbor link to a PDF still opens. One link is public and lasts forever. The other lasts 10 minutes, works only for the person it was made for, and dies when access is revoked.",
    plain:
      "Someone who left the project can still open an old link to a file. One kind of link works for anyone, forever. The other works for 10 minutes, only for the right person, and stops the moment their access is removed.",
    counters: [
      { key: "p4_link_tries", label: "Steps tried on both links", plain: "Things tried" },
      { key: "p4_link_careless_opened", label: "Plain link opened, signed one refused", plain: "Times only the plain link opened" },
    ],
    color: "#FF5CAA",
    status: "live",
  },
];

export const liveChapters = privacyChapters.filter((c) => c.status === "live" || showDrafts);

/** Per visitor per hour. AI questions are shared by all chapters; portal opens cost no AI. */
export const privacyLimits = { asksPerHour: 20, opensPerHour: 200 } as const;

// Writes content/northwind/<slug>.md for every brief in content/northwind-specs.mjs,
// using a small model, consistent with content/northwind-canon.md. Skips existing files.
//
//   node --env-file=.env.local scripts/rag-generate.mjs [--force] [--only=slug,slug]

import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { SPECS } from "../content/northwind-specs.mjs";

const MODEL = "claude-haiku-5-5";
const root = process.cwd();
const canon = await readFile(join(root, "content", "northwind-canon.md"), "utf8");
const force = process.argv.includes("--force");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");

const STYLE = {
  help: "A help-centre article for clients. Clear headings (##), short paragraphs, 300–600 words.",
  handbook: "An internal Notion handbook page for staff. Informal but precise, headings (##), some bullet lists, 300–700 words.",
  case: "A portfolio case study. Sections: ## The client, ## The problem, ## What we did, ## Result. 400–700 words. Only the numbers given in the brief.",
  meeting: "Raw internal meeting notes as typed during the meeting: date line, attendees as initials (OvK, VW, MR, VP, SM, VB, ST, MD, VH, VK, TP, KM...), terse bullets, abbreviations, ## Decisions and ## Actions sections. 200–450 words.",
  slack: "An exported chat channel: lines like `[10:42] Name: message`. Casual, short messages, typos allowed, 12–30 messages.",
  email: "An email thread: each message with From:, To:, Date:, Subject: lines, then the body; newest message last; 2–4 messages; 250–500 words total.",
  blog: "A blog post on the studio website, first person, opinionated, 500–800 words, ## headings.",
  job: "A job posting with ## headings. 250–450 words.",
  legal: "A formal legal document with numbered clauses and sub-clauses (1.1, 1.2...). Precise legal English. For the master services agreement, 2,000–3,000 words.",
  changelog: "A product changelog: ## entries with dates, newest first, 1–4 bullets each.",
  postmortem: "A blameless incident postmortem: ## Summary, ## Timeline (CET times), ## Impact, ## Root cause, ## What went well, ## Follow-ups.",
  draft: "An internal document that is no longer in force. State clearly at the top that it is superseded or not adopted. ## headings. 200–450 words.",
  table: "A reference page built mostly from Markdown tables, with a one-line intro per table and short notes under them.",
  proposal: "A client proposal: ## Summary, ## Scope, ## Team, ## Timeline (week by week), ## Investment (table), ## Terms. 400–700 words.",
  transcript: "A verbatim transcript with speaker labels (`Name:`), filler words, interruptions, timestamps every few minutes like [04:10]. 900–1,600 words.",
  notes: "Working notes: terse, bullets and sub-bullets, a few headings. 250–500 words.",
  brief: "A project brief with ## headings: Background, Goals, Audience, Deliverables, Timeline, Owner. 250–450 words.",
  report: "A short report with a summary, one or two Markdown tables of numbers, and ## Next steps. 250–500 words.",
};

const SYSTEM = `You write documents for the knowledge base of Northwind Studio, a fictional design agency.
The canon below is the single source of truth. Every fact you write must agree with it.
Never introduce prices, percentages, durations, counts or policies that are not in the canon or the brief. If you need a detail that isn't given, leave it out.
Never mention anything listed under "Never mention".
Output only the document in Markdown, starting with "# " and the title. No front matter, no commentary.

<canon>
${canon}
</canon>`;

async function generate(spec) {
  const lang = spec.lang === "nl" ? "Write the whole document in Dutch." : "Write in English.";
  const user = `Document type: ${spec.type}. ${STYLE[spec.type]}
${lang}
Title: ${spec.title}
Dated: ${spec.updated}${spec.status === "archived" ? " (no longer in force)" : ""}
Brief: ${spec.brief}
These exact strings must appear in the document: ${spec.must.map((m) => JSON.stringify(m)).join(", ") || "(none)"}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: spec.type === "legal" ? 12000 : 4000, system: SYSTEM, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`${spec.slug}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const body = j.content.map((b) => b.text ?? "").join("").trim();
  if (j.stop_reason === "max_tokens") throw new Error(`${spec.slug}: cut off`);
  return { body, usage: j.usage };
}

const exists = (p) => access(p).then(() => true, () => false);
const todo = [];
for (const s of SPECS) {
  if (only && !only.includes(s.slug)) continue;
  const path = join(root, "content", "northwind", `${s.slug}.md`);
  if (!force && !only && (await exists(path))) continue;
  todo.push({ s, path });
}

let inTok = 0, outTok = 0, next = 0;
const failed = [];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < todo.length) {
      const { s, path } = todo[next++];
      try {
        const { body, usage } = await generate(s);
        inTok += usage.input_tokens;
        outTok += usage.output_tokens;
        const missing = s.must.filter((m) => !body.includes(m));
        await writeFile(path, `---\ntitle: ${s.title}\nupdated: ${s.updated}\nstatus: ${s.status}\n---\n\n${body}\n`);
        console.log(`${missing.length ? "MISSING" : "ok     "} ${s.slug}${missing.length ? "  " + JSON.stringify(missing) : ""}`);
        if (missing.length) failed.push(s.slug);
      } catch (e) {
        console.log(`ERROR   ${e.message}`);
        failed.push(s.slug);
      }
    }
  })
);
console.log(`\n${todo.length} docs, ${inTok} in / ${outTok} out tokens, ≈ $${((inTok * 0.1 + outTok * 0.5) / 1e6).toFixed(3)}`);
if (failed.length) console.log(`retry: --only=${failed.join(",")}`);

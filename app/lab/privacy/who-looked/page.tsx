import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PrivShell from "@/components/lab/privacy/PrivShell";
import AuditDemo from "@/components/lab/privacy/AuditDemo";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { CONTRACT } from "@/lib/privacy/audit";
import { QUESTIONS } from "@/lib/privacy/questions";
import { auditRuns, privRuns, type AuditRun } from "@/lib/privacy/runs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/privacy/who-looked",
  "Who Looked? — Privacy Lab",
  "Tidepool asks who opened their contract last month. One log can be quietly edited and never records the bot reading it. The other only grows, chains every entry to the one before, and shows the edit."
);

const bad = {
  lang: "ts",
  filename: "careless · log the downloads",
  caption: "Written where a person opens the file. The bot reads through search, a different path, so it never passes here. And the app connects with the owner key, which can rewrite any row.",
  code: `// in the Harbor download handler
await sql(
  "INSERT INTO access_log (at, actor, action) VALUES (now(), $1, 'opened')",
  [user.name],
);`,
};

const good = {
  lang: "ts",
  filename: "careful · append, chain, prove",
  caption: "Every path that reads the file writes here, the bot's search included. The app's role can only insert. The newest hash goes out with each report, so a rewrite stops matching what the client already holds.",
  code: `// GRANT SELECT, INSERT ON log_careful TO audit_writer;  -- no UPDATE, no DELETE
await withTx(async (q) => {
  await q("SET LOCAL ROLE audit_writer");
  const [last] = await q("SELECT seq, hash FROM log_careful ORDER BY seq DESC LIMIT 1");
  const seq = (last?.seq ?? 0) + 1, prev = last?.hash ?? GENESIS;
  const hash = sha256(prev + "\\n" + JSON.stringify([seq, at, actor, action, detail]));
  await q("INSERT INTO log_careful VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [seq, at, actor, action, detail, prev, hash]);
});

// the bot, after search, for every file it pulled in
for (const doc of hits.map((h) => h.doc)) await logRead(doc, "Northwind bot", \`to answer \${client}\`);`,
};

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const KINDS: { kind: AuditRun["kind"]; tech: string; plain: string }[] = [
  { kind: "delete", tech: "Delete", plain: "Delete" },
  { kind: "edit", tech: "Change the name", plain: "Change who" },
  { kind: "delete-rehash", tech: "Delete + re-hash", plain: "Delete, redo seals" },
  { kind: "edit-rehash", tech: "Change + re-hash", plain: "Change, redo seals" },
];
const RECEIPT_SEQ = 8;

export default async function Page() {
  const [runs, priv] = await Promise.all([auditRuns(), privRuns()]);
  const caught = runs.filter((r) => r.caught);
  const missed = runs.filter((r) => !r.caught);
  const refused = runs.filter((r) => r.refused).length;
  const why = (w: string) => caught.filter((r) => r.reason.endsWith(w)).length;
  const missedAfter = missed.every((r) => r.seq > RECEIPT_SEQ);
  const entries = [...new Set(runs.map((r) => r.seq))].sort((a, b) => a - b);
  const asker = (id: string) => QUESTIONS.find((q) => q.id === id)?.as;
  const botReads = priv.filter((r) => r.build === "careless" && asker(r.id) !== "tidepool" && r.retrieved.includes(CONTRACT));
  const foreignRuns = priv.filter((r) => r.build === "careless" && asker(r.id) !== "tidepool").length;

  return (
    <PrivShell slug="who-looked">
      <Section
        n="01"
        tone="tile"
        title="Hide an entry"
        plainTitle="Try it"
        lede="Tidepool asks who opened their contract in September. Two logs answer. Add to them, let the bot read the contract, then try to make Vlas's late-night download disappear with the database owner key."
        plainLede="A client asks who opened their contract last month. Two records answer. Add to them, then try to make one entry disappear and see which record gives it away."
      >
        <AuditDemo />
      </Section>

      <Section
        n="02"
        title="Every entry, four ways to hide it"
        plainTitle="What happened every time"
        lede={`Each run builds a fresh log, 8 September entries and 2 from October, then changes one entry with the owner key and runs the same check as above. Green: the check flagged it. Pink: it passed. Entry ${RECEIPT_SEQ} is the last one in the report Tidepool got on 1 Oct.`}
        plainLede="I tried hiding every entry in four different ways. Green means the careful record gave it away. Pink means it didn't."
      >
        {runs.length > 0 ? (
          <div className="border-[3px] border-brutal-black bg-white overflow-x-auto">
            <div className="min-w-[40rem]">
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,6.5rem)] gap-3 px-4 min-h-12 py-2 items-center border-b-[3px] border-brutal-black bg-cream">
                <span className={label}>
                  <T tech="Entry" plain="Which entry" />
                </span>
                {KINDS.map((k) => (
                  <span key={k.kind} className={label}>
                    <T tech={k.tech} plain={k.plain} />
                  </span>
                ))}
              </div>
              {entries.map((seq) => {
                const row = runs.filter((r) => r.seq === seq);
                return (
                  <div key={seq} className="grid grid-cols-[minmax(0,1fr)_repeat(4,6.5rem)] gap-3 px-4 py-2 items-center border-b-2 border-brutal-black/15 last:border-b-0" style={{ background: seq > RECEIPT_SEQ ? "#FFFBEA" : undefined }}>
                    <span className="font-display text-[14px] leading-snug">
                      #{seq} · {row[0]?.target}
                      {seq === RECEIPT_SEQ && <span className="font-mono text-[11px] opacity-60"> · last in the report</span>}
                      {seq > RECEIPT_SEQ && <span className="font-mono text-[11px] opacity-60"> · after the report</span>}
                    </span>
                    {KINDS.map((k) => {
                      const r = row.find((x) => x.kind === k.kind);
                      return <span key={k.kind} title={r?.reason} className="size-5 border-2 border-brutal-black" style={{ background: r ? (r.caught ? "#C6FF3D" : "#FF5CAA") : "#fff" }} />;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="font-display text-lg">The experiment hasn&apos;t been run on this database yet.</p>
        )}
      </Section>

      {runs.length > 0 && (
        <Section n="03" title="What it showed" plainTitle="What actually happened">
          <Points
            items={[
              {
                title: "The bot's reads were never written down",
                plainTitle: "The bot reads files nobody records",
                body: `In Chapter 2's test the careless bot pulled Tidepool's contract into ${botReads.length} of ${foreignRuns} answers for other clients. A log written in the download handler sees none of them: search reads the file through a different door. The careful log writes the bot down with the client it was answering.`,
                plainBody: `In Chapter 2 the bot read Tidepool's contract to answer other clients ${botReads.length} times. A record that only counts people opening the file shows none of that.`,
              },
              {
                title: "The careless log forgets on request",
                plainTitle: "One record can be quietly changed",
                body: "The app connects with the owner key, so anyone holding it can delete or rewrite a row and renumber the rest. The list Tidepool gets looks complete either way. There's nothing to check it against.",
                plainBody: "Anyone with full access can delete an entry, and the list still looks complete. There's nothing to compare it with.",
              },
              {
                title: `The app couldn't touch it: ${refused} of ${runs.length}`,
                plainTitle: "The app itself can only add",
                body: `Every run first tried to delete the entry the way the app connects. Postgres answered "permission denied for table log_careful" ${refused} times out of ${runs.length}. A bug or a stolen app session can add entries, never remove them.`,
                plainBody: `The app tried to delete the entry ${runs.length} times and the database said no every time. Only someone with full access could change it.`,
              },
              {
                title: `The chain caught ${caught.length} of ${runs.length}`,
                plainTitle: `Caught ${caught.length} of ${runs.length}`,
                body: `With the owner key, the edits went through, and the check flagged them: ${why("missing")} by a missing link, ${why("changed")} by a hash that no longer matched its entry, ${why("receipt")} by a fully re-hashed chain that no longer matched the receipt Tidepool already had.`,
                plainBody: `Someone with full access could make the change, but the seals gave it away ${caught.length} times out of ${runs.length}, even when they redid all the seals, because Tidepool already had the last one.`,
              },
              ...(missed.length
                ? [
                    {
                      title: `What it missed: ${missed.length}`,
                      plainTitle: `What it missed: ${missed.length}`,
                      body: `${missedAfter ? `All ${missed.length} were entries newer than the last report` : `${missed.filter((r) => r.seq > RECEIPT_SEQ).length} were entries newer than the last report`}: re-hashed from there on, or the newest entry simply deleted, which leaves no gap. A chain proves nothing about what came after the last hash someone else holds. Send it more often, or to a place nobody at the studio can change.`,
                      plainBody: `It missed changes to entries made after the last report went out. Until someone outside holds the newest seal, the newest entries can still be rewritten. Send it often.`,
                    },
                  ]
                : []),
            ]}
          />
        </Section>
      )}

      <Section n="04" title="The code" lede="Log the download, against log every read, chained." plainLede="What the two approaches do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The careless version writes down people downloading the file, in a table anyone with full access can edit. The careful one writes every read, the bot's too, links each entry to the one before, and only lets the app add.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Editable" note="One door logged, the owner key can rewrite it." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Sealed" note="Every door, insert-only, chained, receipted." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Can't the owner just re-hash everything?" plain="Can't someone just redo all the seals?" />}>
            <p>
              <T
                tech="Yes, and the chain alone wouldn't notice. That's what the receipt is for: the newest hash leaves the building with each report. Rewrite anything before it and the chain stops matching the copy the client holds. Anything after it is unprotected until the next receipt goes out."
                plain="Yes. That's why the newest seal goes to the client with every report. Redo the seals and they no longer match the copy the client has. Anything newer than that copy isn't protected yet."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why log the bot at all?" plain="Why does the bot count?" />}>
            <p>
              <T
                tech="Because it reads on someone's behalf, and its read is how a file ends up in an answer for someone else. Chapter 2 is exactly that read. Log which file it pulled, for whom, and the question, at the search step, not where people click."
                plain="Because when the bot reads a file to answer someone, that file can end up in front of them. Chapter 2 shows how. If nobody writes it down, nobody can find out later."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Isn't the hash encryption?" plain="Does the seal hide anything?" />}>
            <p>
              <T
                tech="No. Anyone with access can read every entry. The hash doesn't hide anything; it makes a change detectable. SHA-256 of the previous hash plus the entry: change one byte anywhere and every hash after it changes."
                plain="No. Anyone allowed can still read the record. The seals don't hide it, they make any change show."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is this what auditors ask for?" plain="Is this what the rules ask for?" />}>
            <p>
              <T
                tech="Security audits such as SOC 2 and ISO 27001 ask for access logs and for proof they can't be quietly changed. This is one way to show that; it doesn't make anyone certified. Under GDPR the log is personal data too, since it says who did what and when: keep it as long as you need, not forever."
                plain="Security audits ask for records of who opened what, and for proof nobody can quietly change them. This is one way. It doesn't make anyone certified. The record itself is about people too, so it shouldn't be kept forever."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What would you use in production?" plain="What do real systems use?" />}>
            <p>
              <T
                tech="The same layers, with less of them built by hand: grants so the app can only insert, pgaudit if the database itself should log, and the newest hash written somewhere nobody at the company can change, such as write-once object storage (S3 Object Lock) or the client's own inbox."
                plain="The same ideas: the app can only add, and the newest seal is kept somewhere the company itself can't change."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How is “caught” decided?" plain="Who checks the result?" />}>
            <p>
              <T
                tech={`Code: each run builds a fresh log, tries to delete the entry as the app, changes it with the owner key, then runs the check from the demo: numbering, links, each hash recomputed, and the receipt. ${entries.length} entries × ${KINDS.length} changes. The first batch had a bug in the test: four “edits” put Sandra's name on entries that were already Sandra's, changed nothing, and showed as misses. Fixed; this is the second batch.`}
                plain="The same check as in the demo, run in code on every entry and every kind of change. My first test run had a bug: some changes didn't actually change anything. I fixed it and ran it again."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </PrivShell>
  );
}

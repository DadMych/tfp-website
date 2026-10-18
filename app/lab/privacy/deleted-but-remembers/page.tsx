import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PrivShell from "@/components/lab/privacy/PrivShell";
import ForgetDemo from "@/components/lab/privacy/ForgetDemo";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { FORGET_QUESTIONS, HALDEN_FILES } from "@/lib/privacy/questions";
import { forgetRuns, type ForgetRun } from "@/lib/privacy/runs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/privacy/deleted-but-remembers",
  "Deleted, But It Remembers — Privacy Lab",
  "Halden asks for its files to be deleted. One build deletes the file. The other deletes the file, its pieces in the search index and every cached answer built from it. Then ask the bot."
);

const bad = {
  lang: "ts",
  filename: "careless · delete the file",
  caption: "The folder is empty, so the request looks done. The search index and the answer cache were filled from those files and nobody told them.",
  code: `// "Please delete our files."
await sql("DELETE FROM harbor.files WHERE project_id = $1", [project]);
await confirmInWriting(client);`,
};

const good = {
  lang: "ts",
  filename: "careful · delete everywhere it went",
  caption: "One transaction for every copy the system made, and links that check at the moment of the click. In the lab this is per visitor; this is the version without the sandbox.",
  code: `await withTx(async (q) => {
  await q("DELETE FROM harbor.files WHERE project_id = $1", [project]);
  await q("DELETE FROM rag.chunks WHERE doc_slug = ANY($1)", [docs]);
  await q(\`DELETE FROM answer_cache WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(sources) s
     WHERE s->>'doc' = ANY($1))\`, [docs]);
  await q("INSERT INTO deletions (client, docs) VALUES ($1, $2)", [client, docs]);
});

// an old citation, clicked later
if (await isDeleted(doc)) return new Response("Gone", { status: 410 });`,
};

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

function Cells({ runs }: { runs: ForgetRun[] }) {
  return (
    <span className="flex gap-1">
      {runs.map((r, i) => (
        <span key={i} title={r.reason} className="size-5 border-2 border-brutal-black" style={{ background: r.clean ? "#C6FF3D" : "#FF5CAA" }} />
      ))}
    </span>
  );
}

export default async function Page() {
  const runs = await forgetRuns();
  const of = (build: ForgetRun["build"], step: ForgetRun["step"], id?: string) => runs.filter((r) => r.build === build && r.step === step && (!id || r.id === id));
  const quoted = (rs: ForgetRun[]) => rs.filter((r) => !r.clean).length;
  const before = of("careless", "before");
  const found = before.filter((r) => r.sawDeleted).length;
  const [cCache, cIndex, sCache, sIndex] = [of("careless", "cache"), of("careless", "index"), of("careful", "cache"), of("careful", "index")];
  const told = sIndex.filter((r) => /deleted|deletion/i.test(r.answer)).length;

  return (
    <PrivShell slug="deleted-but-remembers">
      <Section
        n="01"
        tone="tile"
        title="Delete, then ask"
        plainTitle="Try it"
        lede={`Halden Health asked for its files to be deleted, and Sofie confirmed in writing. You're on Northwind's staff, asking the studio's bot about Halden's audit. Ask first, delete the ${HALDEN_FILES.length} files, then ask again. Two builds, each with its own idea of what “delete” means.`}
        plainLede="A client asked for its files to be deleted. You work at the studio and ask the company bot about that client. Ask first, delete the files, then ask again and see which bot still remembers."
      >
        <ForgetDemo />
      </Section>

      <Section
        n="02"
        title="Three questions, three runs each"
        plainTitle="What happened every time"
        lede="Each run starts fresh: ask, delete, ask the same question again, then ask it in other words. Pink: after the deletion, the answer cites one of the deleted files. Open a row to read the answers."
        plainLede="Each test: ask, delete, ask again, then ask in other words. Pink means the bot quoted a deleted file after the deletion. Click a question to read the answers."
      >
        {runs.length > 0 ? (
          <div className="border-[3px] border-brutal-black bg-white overflow-x-auto">
            <div className="min-w-[40rem]">
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem] gap-3 px-4 h-12 items-center border-b-[3px] border-brutal-black bg-cream">
                <span className={label}>
                  <T tech="Question, then in other words" plain="What was asked" />
                </span>
                <span className={label}>
                  <T tech="Careless · same" plain="Careless · again" />
                </span>
                <span className={label}>
                  <T tech="Careless · reworded" plain="Careless · new words" />
                </span>
                <span className={label}>
                  <T tech="Careful · same" plain="Careful · again" />
                </span>
                <span className={label}>
                  <T tech="Careful · reworded" plain="Careful · new words" />
                </span>
              </div>
              {FORGET_QUESTIONS.map((q) => {
                const cells = [of("careless", "cache", q.id), of("careless", "index", q.id), of("careful", "cache", q.id), of("careful", "index", q.id)];
                const show = [
                  { name: "Careless, reworded", r: cells[1].find((r) => !r.clean) ?? cells[1][0], bg: "#FFD1E8" },
                  { name: "Careful, reworded", r: cells[3][0], bg: "#EEFFC2" },
                ];
                return (
                  <details key={q.id} className="border-b-2 border-brutal-black/15 last:border-b-0">
                    <summary className="cursor-pointer list-none grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem] gap-3 px-4 py-2.5 items-center hover:bg-cream">
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-display text-[15px] leading-snug">{q.q}</span>
                        <span className="font-mono text-[11px] opacity-60">{q.again}</span>
                      </span>
                      {cells.map((c, i) => (
                        <Cells key={i} runs={c} />
                      ))}
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 pb-4">
                      {show.map(
                        ({ name, r, bg }) =>
                          r && (
                            <div key={name} className="border-2 border-brutal-black p-3 flex flex-col gap-1.5" style={{ background: bg }}>
                              <span className={label}>
                                {name} · {r.reason}
                              </span>
                              <p className="font-display text-[14px] leading-snug">{r.answer}</p>
                            </div>
                          )
                      )}
                    </div>
                  </details>
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
                title: "Gone from the folder, not from the bot",
                plainTitle: "Deleted from the folder, still in the bot",
                body: `Before the deletion, the search found Halden's files in ${found} of ${before.length} runs. After it, the careless bot cited a deleted file in ${quoted(cCache)} of ${cCache.length} answers to the same question and ${quoted(cIndex)} of ${cIndex.length} in other words. The folder was empty the whole time.`,
                plainBody: `After the deletion, the careless bot quoted a deleted file in ${quoted(cCache)} of ${cCache.length} answers to the same question, and ${quoted(cIndex)} of ${cIndex.length} when it was asked in other words. The folder was empty.`,
              },
              {
                title: "The cache never asks",
                plainTitle: "Saved answers don't check",
                body: `The same question came straight back from the answer cache: no search, no model, ${quoted(cCache)} of ${cCache.length} answers quoting a file that no longer exists. Clean the index and this still happens. A cache has to be told what it was built from.`,
                plainBody: `Asked the same question again, the bot simply repeated its saved answer, deleted file and all. It never looked anything up, so cleaning the bot's copies wouldn't have helped. Saved answers have to be deleted too.`,
              },
              {
                title: "The index still has the pieces",
                plainTitle: "Its copies were still there",
                body: `Reworded questions miss the cache and go to search. The ${HALDEN_FILES.length} files had been split into pieces and stored when they were added, and deleting the file doesn't touch them: ${quoted(cIndex)} of ${cIndex.length} reworded answers cited them.`,
                plainBody: `Asked in other words, the bot searched again and found the copies it had made of the files when they were added. Deleting the file didn't delete those copies.`,
              },
              {
                title: "Careful forgot, and said so",
                plainTitle: "The careful bot really forgot",
                body: `The careful bot: ${quoted(sCache) + quoted(sIndex)} of ${sCache.length + sIndex.length} after the deletion. In ${told} of ${sIndex.length} reworded answers it mentioned the deletion instead, from the one email it kept: the request itself, the record that the deletion was done.`,
                plainBody: `The careful bot didn't quote a deleted file once in ${sCache.length + sIndex.length} answers. Sometimes it mentioned the deletion instead, from the one email kept as proof.`,
              },
              {
                title: "Old links have to check",
                plainTitle: "Old links still opened",
                body: "Click a citation in the chat history after the deletion. The careless link opens the file, because it points at a copy and checks nothing. The careful one asks at the moment of the click and answers 410 Gone, with the time it was deleted.",
                plainBody: "Click a [1] in an old answer after the deletion. The careless one still opens the file. The careful one checks first and says it was deleted.",
              },
            ]}
          />
        </Section>
      )}

      <Section n="04" title="The code" lede="Delete the file, against delete every copy." plainLede="What the two approaches do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The careless version deletes the file and stops. The careful one also deletes the bot's copies and its saved answers, and old links check before they open anything.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Looked done" note="The folder is empty. The bot isn't." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Held" note="Every copy, one transaction, links that check." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Where else does a file end up?" plain="Where else could a deleted file be hiding?" />}>
            <p>
              <T
                tech="Search pieces and their embeddings, answer caches, question logs that stored the answer, exports, backups, and the copies people downloaded. Write the list down when you build the feature, not when the first request arrives. Backups usually expire on their own schedule; say so in the confirmation. Sofie's email already says what isn't deleted: invoices, kept 7 years by law, and anything Halden's own team downloaded."
                plain="In the bot's copies, saved answers, logs, backups and on the laptops of people who downloaded it. Make the list when you build the feature. Sofie's confirmation says what stays: invoices, which the law says to keep, and copies the client downloaded."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Other files still mention Halden" plain="Is every trace of Halden gone?" />}>
            <p>
              <T
                tech="No. Meeting notes and the portfolio rules still name Halden and its confidentiality clause. Those aren't Halden's files, they're Northwind's notes about a client. Whether they go too is a decision for a person to make, not something a search filter can work out."
                plain="No. Some of the studio's own notes still mention Halden by name. They aren't Halden's files. Whether to delete those is a decision for a person, not the computer."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is this GDPR erasure?" plain="Is this what privacy law asks for?" />}>
            <p>
              <T
                tech="It's the same mechanics that GDPR's right to erasure needs when the files hold personal data: find every copy, delete it, confirm in writing. This lab doesn't make anyone compliant. Halden asked under its contract, which allows deletion on request, confirmed within 10 working days."
                plain="It's the same work privacy laws ask for: find every copy, delete it, confirm it. Doing it in this lab doesn't make anyone compliant. Halden asked under its contract, which allows it."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Revoking access isn't deleting" plain="What if someone just loses access?" />}>
            <p>
              <T
                tech="Same lesson, different trigger. Search reads permissions at question time (Chapter 2), and a link checks at click time, not when it was made. Chapter 6 is the link that outlives the access behind it."
                plain="Same idea: every lookup and every link has to check at that moment, not trust what was true when it was made. Chapter 6 is about exactly that."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How is “quoted a deleted file” decided?" plain="Who decides it remembered?" />}>
            <p>
              <T
                tech="Code: after the deletion, the answer cites a source that is one of the deleted files. The search settings are Part 1's careful build. Each run uses its own sandbox, cleared afterwards. One batch, three runs per question, not re-run."
                plain="A simple check in code: did an answer after the deletion point to a deleted file? One run of the test, not repeated until it looked good."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </PrivShell>
  );
}

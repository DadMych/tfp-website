import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PrivShell from "@/components/lab/privacy/PrivShell";
import AskAs from "@/components/lab/privacy/AskAs";
import LeakTable from "@/components/lab/privacy/LeakTable";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { sql } from "@/lib/db";
import { allowedDocs, canSee } from "@/lib/privacy/access";
import { PERSONAS, QUESTIONS } from "@/lib/privacy/questions";
import { privRuns } from "@/lib/privacy/runs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/privacy/bot-knows-too-much",
  "The Bot Knows Too Much — Privacy Lab",
  "The Part 1 support bot, logged in as one client. One build searches every file and hides the sources afterwards. The other searches only what that client may open."
);

const bad = {
  lang: "ts",
  filename: "careless · filter the answer",
  caption: "The model reads every file, then the code hides the citations the client can't open. The words built from those files stay in the answer.",
  code: `const hits = await search(question, CONFIG);   // all 140 files
const text = await answer(question, hits);     // the model reads them all

return text.replace(/\\[(\\d+)\\]/g, (m, n) =>
  canSee(user, hits[n - 1].doc) ? m : "[·]");  // hide the source, keep the words`,
};

const good = {
  lang: "ts",
  filename: "careful · filter the search",
  caption: "Work out what the client may open first, and make it part of both searches. Nothing else is ever in the prompt, so there's nothing to hide.",
  code: `const allow = allowedDocs(user, slugs);        // public + the client's own
const hits = await search(question, CONFIG, null, { allow });
const text = await answer(question, hits);

// inside the keyword and the vector search
WHERE c.strategy = $2
  AND c.doc_slug = ANY($allow::text[])`,
};

/** The answer itself says what it's sharing is private. */
const KNEW = /internal|cannot name|can['’]t name|must not|must never|not a policy|not to be offered|should not/i;

export default async function Page() {
  const [runs, slugs] = await Promise.all([privRuns(), sql<{ slug: string }>("SELECT slug FROM rag.docs").then((r) => r.map((x) => x.slug))]);
  const visible = Object.fromEntries(PERSONAS.map((p) => [p, allowedDocs(p, slugs).length]));
  const kind = new Map(QUESTIONS.map((q) => [q.id, q]));

  const pick = (build: "careless" | "careful", k: "foreign" | "own") => runs.filter((r) => r.build === build && kind.get(r.id)?.kind === k);
  const [cForeign, cOwn, sForeign, sOwn] = [pick("careless", "foreign"), pick("careless", "own"), pick("careful", "foreign"), pick("careful", "own")];
  const leaked = (rs: typeof runs) => rs.filter((r) => !r.clean).length;
  const knew = cForeign.filter((r) => !r.clean && KNEW.test(r.answer)).length;
  const offLimits = cForeign.map((r) => r.retrieved.filter((d) => !canSee(kind.get(r.id)!.as, d)).length);
  const allFive = offLimits.filter((n) => n === 5).length;
  const avgOff = offLimits.length ? offLimits.reduce((a, b) => a + b, 0) / offLimits.length : 0;
  const declined = sForeign.filter((r) => r.reason === "declined").length;
  const answeredOwn = sOwn.filter((r) => r.reason === "answered").length;
  const fQuestions = QUESTIONS.filter((q) => q.kind === "foreign").length;

  return (
    <PrivShell slug="bot-knows-too-much">
      <Section
        n="01"
        tone="tile"
        title="Log in and ask"
        plainTitle="Try it"
        lede="Pick who you're logged in as, then ask. The question goes to two copies of the Part 1 bot. The careless one searches every file and, before you see the answer, hides any source you're not allowed to open. The careful one only searches the files you may open."
        plainLede="Pick which client you are, then ask something. Two copies of the same bot answer. One reads every file and hides where it got things from. The other only reads files you're allowed to see."
      >
        <AskAs visible={visible} total={slugs.length} />
      </Section>

      <Section
        n="02"
        title="Ten questions, three runs each"
        plainTitle="What happened every time"
        lede={`${fQuestions} questions whose answer sits in someone else's file, ${QUESTIONS.length - fQuestions} about the client's own business. Each asked three times of both bots, every answer stored and checked by code. Pink: the answer cites a file that client may not open. Open a row to read the answers.`}
        plainLede="Ten questions, each asked three times of both bots. Pink means the answer used a file that client isn't allowed to see. Click a question to read what each bot said."
      >
        {runs.length > 0 ? <LeakTable questions={QUESTIONS} runs={runs} /> : <p className="font-display text-lg">The experiment hasn&apos;t been run on this database yet.</p>}
      </Section>

      {runs.length > 0 && (
        <Section n="03" title="What it showed" plainTitle="What actually happened">
          <Points
            items={[
              {
                title: "Hiding the source hides nothing",
                plainTitle: "Hiding where it came from doesn't help",
                body: `On the ${fQuestions} questions whose answer belongs to someone else, the careless bot cited a file the client may not open in ${leaked(cForeign)} of ${cForeign.length} answers. Brightlane asks about fintech work and reads that Tidepool's onboarding drop-off fell from 42% to 27%. The citation turns into a black box. The number doesn't. The careful bot: ${leaked(sForeign)} of ${sForeign.length}.`,
                plainBody: `On questions whose answer belongs to another client, the careless bot used that client's file ${leaked(cForeign)} of ${cForeign.length} times. Brightlane asks about fintech work and learns another client's private numbers. The source is hidden, the numbers aren't. The careful bot: ${leaked(sForeign)} times.`,
              },
              {
                title: "Ordinary questions leak too",
                plainTitle: "Even innocent questions leak",
                body: `“How many revision rounds are included?” is a public matter. The careless bot answered it from the internal sales notes, and once from Verdant's proposal. On the client's own business it still cited an off-limits file in ${leaked(cOwn)} of ${cOwn.length} answers. Nobody has to ask a sneaky question.`,
                plainBody: `“How many revision rounds are included?” is public. The careless bot still answered from staff-only notes and another client's proposal. On questions about the client's own business it used a file it shouldn't in ${leaked(cOwn)} of ${cOwn.length} answers.`,
              },
              {
                title: "It knew, and said it anyway",
                plainTitle: "It knew it was secret",
                body: `In ${knew} of the ${leaked(cForeign)} leaks, the answer itself says the thing is internal or can't be shared, in the same breath as sharing it: “an account lead may approve up to 5% extra discount… this limit is internal”. The model reads the warning as one more fact to pass on.`,
                plainBody: `In ${knew} of the ${leaked(cForeign)} leaks, the bot even says the information is private or internal while giving it away. A warning inside a file doesn't stop the AI from repeating the file.`,
              },
              {
                title: "Careful isn't the same as useless",
                plainTitle: "The careful bot still answers",
                body: `On the client's own business the careful bot answered ${answeredOwn} of ${sOwn.length} times, including Tidepool asking about its own retainer. On the off-limits questions it said “I don't know” ${declined} of ${sForeign.length} times. The rest were Atlas asking what Tidepool gets: it explained the public Partner plan and said the files don't mention Tidepool.`,
                plainBody: `Asked about their own business, the careful bot answered ${answeredOwn} of ${sOwn.length} times. Asked about someone else's, it said it doesn't know, or gave only the public facts.`,
              },
              {
                title: "Filtering after the search starves the bot",
                plainTitle: "Throwing files out afterwards leaves nothing",
                body: `On the off-limits questions, ${avgOff.toFixed(1)} of the 5 pieces the careless search picked were off-limits, on average. In ${allFive} of ${cForeign.length} runs, all five were. Drop them after the search and the bot has nothing left to answer from. Filter inside the search and it gets five pieces it may read.`,
                plainBody: `The careless search mostly picked files the client isn't allowed to see: in ${allFive} of ${cForeign.length} runs, all five. Throw them out after searching and there's nothing left. Search only the allowed files and you still get five.`,
              },
            ]}
          />
        </Section>
      )}

      <Section n="04" title="The code" lede="Filter the answer against filter the search." plainLede="What the two approaches do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The careless bot reads everything and tidies up the answer afterwards. The careful one is only ever given the files the client may see.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Leaked" note="Search everything, clean up the answer." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Held" note="The permission check is part of the search." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why not tell the model to keep secrets?" plain="Can't you just tell the AI not to share?" />}>
            <p>
              <T
                tech="The leaking answers above already say “this is internal” and share it anyway. A rule in the prompt asks the model to keep a secret it has already read, and to know which client is asking. I didn't test that variant here. In Part 1, Poisoned Files tested a prompt rule against planted files, and it changed nothing."
                plain="The leaking answers already say “this is private” and share it anyway. Asking nicely means trusting the AI to keep a secret it has already read. Where I tested a rule like that in Part 1, it changed nothing."
              />
            </p>
          </Deep>
          <Deep q={<T tech="This is the data-room question" plain="Where does this matter most?" />}>
            <p>
              <T
                tech="Virtual data rooms, legal review, health records, any SaaS with many customers and an AI search box: the search index has to obey the same permissions as the folders. Store who may see each piece, filter in the query, and read permissions at question time. Remove someone from a folder and they're out of search on their next question, not after a re-index."
                plain="Anywhere many customers share one system: data rooms for company deals, law firms, clinics, business software with an AI search box. The search has to follow the same rules as the folders, and a change of access has to count from the next question."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Filtering a vector index has a catch" plain="Is filtering the search always easy?" />}>
            <p>
              <T
                tech="An approximate index like HNSW finds the nearest neighbours first and filters after. With a narrow filter you can ask for 20 and get 3. Here the table is small, so the filtered search skips the index and scans every piece exactly. At scale: pgvector's iterative index scans, one partition per client, or a separate index per client."
                plain="Not quite. The fast index behind meaning-based search finds close matches first and only then throws out the forbidden ones, so you can end up with very few. Here there are few enough files to check them all. Big systems split the index per client."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Where does the permission map come from?" plain="Who decides who sees what?" />}>
            <p>
              <T
                tech="Here it's a map I wrote: public pages for everyone, internal files for staff, each client's emails, proposals and reports for that client. In a real Harbor it would be the same table that decides who can open the file. Search reads that table at question time, not a copy stamped onto the index that goes stale."
                plain="Here I wrote it by hand. In a real portal it's the same list that decides who can open a file, and the search checks it every time, not a copy that goes out of date."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How is a leak decided?" plain="Who decides it leaked?" />}>
            <p>
              <T
                tech="Code: the answer cites a source the client may not open. Using a file without citing it would slip past that check, so the count is a floor. The search settings are Part 1's careful build. One batch, three runs per question, not re-run until it looked good."
                plain="A simple check in code: did the answer point to a file that client can't open? An answer that used a file without pointing to it wouldn't be counted, so the real number can only be higher. One run of the test, not repeated until it looked good."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </PrivShell>
  );
}

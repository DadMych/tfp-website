import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import AiShell from "@/components/lab/ai/AiShell";
import EvalGrid from "@/components/lab/ai/EvalGrid";
import Scoreboard, { LADDER, configLabel } from "@/components/lab/ai/Scoreboard";
import { Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { EVALSET, type EvalKind } from "@/lib/rag/evalset";
import { QUESTION_KINDS } from "@/lib/rag/kinds";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { contrasts, gradedAnswers, latestScores } from "@/lib/rag/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab/ai/test-set", "Prove It — AI Lab", "65 questions with an answer key, six RAG pipelines, same model and prompt. Every stored answer, graded by code, and the ones the first build got confidently wrong.");

const N = EVALSET.length;

const grader = {
  lang: "ts",
  filename: "lib/rag/answer.ts",
  caption: "No second model judging the first. The key lists the facts an answer must contain (with accepted spellings), the out-of-date values it must not lead with, and the exact sentence it must use when the files don't say.",
  code: `export function grade(q: EvalQuestion, text: string) {
  const declined = DECLINE.test(text.trim());
  if (q.kind === "unanswerable")
    return declined ? ok("declined") : wrong("answered a question the documents don't cover");
  if (declined) return wrong("said it doesn't know");

  const missing = q.facts.find((f) => firstAt(text, f) === Infinity);   // "5,800" | ["5.800", …]
  if (missing) return wrong(\`missing \${JSON.stringify(missing)}\`);

  // Mentioning the 2025 price as history is fine. Leading with it is not.
  const firstFact = Math.min(...q.facts.map((f) => firstAt(text, f)));
  const bad = q.forbid?.find((f) => at(text, f) >= 0 && at(text, f) < firstFact);
  return bad ? wrong(\`led with \${JSON.stringify(bad)}\`) : ok("all facts present");
}

// lib/rag/evalset.ts
{ id: "s1", kind: "stale", q: "How much is the Studio retainer per month?",
  facts: ["5,800"], forbid: ["5,200"] },`,
};

export default async function Page() {
  const [scores, answers, shown] = await Promise.all([latestScores(), gradedAnswers(LADDER), contrasts(QUICK_KEY, CAREFUL_KEY, ["b2", "l2", "b7", "p4", "b8", "l1"]).then((c) => c.slice(0, 3))]);
  const configs = LADDER.filter((c) => answers.some((a) => a.config === c));
  const kinds = (Object.keys(QUESTION_KINDS) as EvalKind[]).filter((k) => k !== "unanswerable");
  const ladder = LADDER.map((c) => scores.find((s) => s.config === c)).filter((s) => s != null);

  return (
    <AiShell slug="test-set">
      <Section
        n="01"
        tone="tile"
        title="The scoreboard"
        plainTitle="The results"
        lede={`${N} questions with an answer key, run through six pipelines. The model and the prompt never change between rows. Only how the pages are found.`}
        plainLede={`I wrote ${N} questions with known answers and ran six versions of the bot through all of them. The AI is the same in every row. Only the way it looks things up changes.`}
      >
        <Scoreboard scores={scores} />

        <div className="border-[3px] border-brutal-black bg-white text-brutal-black shadow-[8px_8px_0_0_#000] p-5 md:p-6 flex flex-col gap-4 overflow-x-auto">
          <h3 className="font-display font-black uppercase tracking-[-0.03em] text-xl md:text-2xl leading-none">
            <T tech="Retrieval by question kind" plain="Where each version finds the right page" />
          </h3>
          <table className="w-full min-w-[40rem] border-collapse font-mono text-[11px]">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 border-b-[3px] border-brutal-black" />
                {kinds.map((k) => (
                  <th key={k} className="px-1.5 py-1.5 border-b-[3px] border-brutal-black font-bold uppercase tracking-[0.05em] text-[10px] leading-tight align-bottom">
                    <T tech={QUESTION_KINDS[k][0]} plain={QUESTION_KINDS[k][1]} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ladder.map((s) => (
                <tr key={s.config} className="border-b border-brutal-black/10">
                  <td className="px-2 py-1.5 font-bold uppercase tracking-[0.05em] whitespace-nowrap">
                    <T tech={configLabel(s.config, false)} plain={configLabel(s.config, true)} />
                  </td>
                  {kinds.map((k) => {
                    const [hit, of] = s.byKind[k] ?? [0, 0];
                    const r = of ? hit / of : 0;
                    return (
                      <td key={k} className="px-1.5 py-1.5 text-center tabular-nums">
                        <span className={`inline-block min-w-[3rem] px-1 py-0.5 border-2 border-brutal-black ${r === 1 ? "bg-[#C6FF3D]" : r < 0.6 ? "bg-[#FF5CAA]" : "bg-brutal-yellow"}`}>
                          {hit}/{of}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {shown.length > 0 && (
        <Section n="02" title="Wrong in different ways" plainTitle="What the quick version said" lede="Verbatim answers from the stored runs, where the first build missed and the careful one didn't. Some give up, some hedge, some answer around the one fact that mattered. None of them crashes." plainLede="Word for word, from the test runs. The quick version gives up, hedges, or misses the one number you needed. The careful one finds it.">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {shown.map((c) => (
              <figure key={c.id} className="flex flex-col border-[3px] border-brutal-black bg-white shadow-[5px_5px_0_0_#000]">
                <figcaption className="px-4 py-3 border-b-[3px] border-brutal-black font-display font-bold text-base leading-snug bg-cream">{EVALSET.find((q) => q.id === c.id)?.q}</figcaption>
                <div className="px-4 py-3 bg-[#FFE4F1] border-b-[3px] border-brutal-black flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
                    <T tech="First build" plain="Quick version" />
                  </span>
                  <p className="font-display text-sm leading-snug">{c.quick}</p>
                </div>
                <div className="px-4 py-3 bg-[#F2FFD6] flex flex-col gap-1.5 flex-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
                    <T tech="Careful build" plain="Careful version" />
                  </span>
                  <p className="font-display text-sm leading-snug">{c.careful}</p>
                </div>
              </figure>
            ))}
          </div>
        </Section>
      )}

      <Section
        n={shown.length ? "03" : "02"}
        title="Every answer"
        plainTitle="Check every answer"
        lede={`${N} questions × ${configs.length} pipelines, each cell a stored answer. Pick one to read it next to its key.`}
        plainLede="Every square is a real answer from the test runs: green right, pink wrong. Click one to read it."
      >
        <EvalGrid configs={configs} answers={answers} />
      </Section>

      <Section n={shown.length ? "04" : "03"} title="What held" plainTitle="How to test an AI">
        <Points
          items={[
            {
              title: "Write the traps first",
              plainTitle: "Ask the hard questions",
              body: "Easy questions pass on every pipeline. The set is mostly the hard kinds: a price that changed twice, a fact in one email, a question in German, a policy exception that looks like policy, and six questions the files can't answer.",
              plainBody: "Easy questions pass on every version. The useful ones are the tricky kinds: changed prices, facts hidden in one email, other languages, and questions it should refuse.",
            },
            {
              title: "Grade with code",
              plainTitle: "Check with a script, not a feeling",
              body: "Required facts, forbidden stale values, an exact decline sentence. Deterministic, free, and when a grade looks wrong you fix the key and re-grade every stored answer without calling the model again.",
              plainBody: "A script checks each answer for the facts it must contain. Same answer, same verdict, every time. When the key is wrong, fix it and re-check everything in seconds.",
            },
            {
              title: "Measure the parts separately",
              plainTitle: "Find where it broke",
              body: "Retrieval and answers are scored apart. When an answer is wrong, the retrieval column says whether the bot never saw the fact or saw it and still got it wrong. Those are different fixes.",
              plainBody: "Two scores: did it find the right page, and did it answer right. A wrong answer with the right page is a different problem from never finding the page.",
            },
          ]}
        />
      </Section>

      <Section n={shown.length ? "05" : "04"} title="The code" lede="The grader behind every square above." plainLede="How an answer gets checked, in one sentence. The code itself is one click away.">
        <TechOnly plain="Each test question comes with the facts a right answer must contain and the old numbers it must not lead with. A short script checks every answer against that list.">
          <CodeSnippet snippet={grader} />
        </TechOnly>
      </Section>

      <Section n={shown.length ? "06" : "05"} title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why not use a model as the judge?" plain="Why not let another AI do the checking?" />}>
            <p>
              <T
                tech="For questions with a factual answer, a key is cheaper, faster and doesn't drift. An LLM judge earns its place on open-ended answers, tone, or helpfulness, and then it needs its own test set. Here every question has a checkable fact, so a judge would add noise."
                plain="When there's a right answer, checking for it with a script is cheaper and never changes its mind. Another AI is useful for judging tone or style, but then you have to test that AI too."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Isn't a near-perfect score suspicious?" plain="Doesn't a near-perfect score sound too good?" />}>
            <p>
              <T
                tech={`Yes, and it should. It's on these ${N} questions, which I wrote knowing the files. The same pipeline can drop one answer between runs, because the model isn't deterministic. Your own questions have no key: check the numbers against the sources it shows. The set's job is to catch regressions when something changes, not to promise a number in production.`}
                plain={`Yes. It's a score on my ${N} questions, not a promise about yours, and it can move by one answer between runs. The point of the list is to notice when a change makes things worse.`}
              />
            </p>
          </Deep>
          <Deep q={<T tech="How long does a full run take?" plain="How long does checking everything take?" />}>
            <p>
              <T
                tech={`One pipeline through all ${N} questions with answers takes about 20 seconds with 4 workers and costs about two cents. Retrieval-only runs, all 24 combinations of the switches, skip the model and cost only embedding and rerank tokens.`}
                plain="About 20 seconds and two cents per version. Cheap enough to run after every change."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}

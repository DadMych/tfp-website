import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import CiteCheck from "@/components/lab/ai/CiteCheck";
import EvalGrid from "@/components/lab/ai/EvalGrid";
import { LADDER } from "@/components/lab/ai/Scoreboard";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import audit from "@/lib/rag/cite-audit.json";
import type { Claim } from "@/lib/rag/cite";
import { EVALSET } from "@/lib/rag/evalset";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { gradedAnswers } from "@/lib/rag/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cite or Decline — AI Lab",
  description: "Every number in an answer checked against the source it cites, by code. An audit of the stored test answers of two builds, the three ways citations go wrong, and what six builds said when the files had no answer.",
  alternates: { canonical: "/lab/ai/cite-or-decline" },
};

type Audit = {
  config: string;
  at: string | null;
  rows: { id: string; same: boolean; claims: Claim[] }[];
}[];

const BUILDS = [
  { key: QUICK_KEY, tech: "First build", plain: "Quick version" },
  { key: CAREFUL_KEY, tech: "Careful build", plain: "Careful version" },
];

const FLAG = {
  elsewhere: { tech: "Wrong source", plain: "Wrong file", bg: "#FFE600" },
  nowhere: { tech: "In no source", plain: "Not in the files", bg: "#FF5CAA" },
  uncited: { tech: "No citation", plain: "No source given", bg: "#FFB38A" },
} as const;

const bad = {
  lang: "tsx",
  filename: "Answer.tsx · trust the brackets",
  caption: "Turning [2] into a link looks like accountability. Nobody checks that source 2 says what the sentence says.",
  code: `{citeParts(answer).map((p, i) =>
  "n" in p
    ? <a key={i} href={\`#source-\${p.n}\`}>[{p.n}]</a>
    : <span key={i}>{p.text}</span>
)}`,
};

const good = {
  lang: "ts",
  filename: "lib/rag/cite.ts",
  caption: "Split the answer into sentences, pull out everything that can be matched exactly, and look for it in the sources the sentence cites, then in the others. Free, instant, and it runs on every answer.",
  code: `export function checkCitations(answer: string, sources: CheckSource[]): Claim[] {
  if (DECLINE.test(answer.trim())) return [];
  return sentences(answer).map((sentence) => {
    const cites = [...sentence.matchAll(/\\[(\\d+)\\]/g)].map((m) => Number(m[1]));
    const facts = [...strip(sentence).matchAll(FACT)].map(([value]) => ({
      value,                                   // "€11,200", "40%", "NW-RET-L", "1 March 2026"
      inCited: sources.filter((s) => cites.includes(s.n) && contains(s, value)).map((s) => s.n),
      inOther: sources.filter((s) => !cites.includes(s.n) && contains(s, value)).map((s) => s.n),
    }));
    return { sentence, cites, facts, status: verdict(cites, facts) };
  });
}`,
};

export default async function Page() {
  const data = audit as Audit;
  const answers = await gradedAnswers(LADDER);
  const declines = answers.filter((a) => a.id.startsWith("u"));
  const perfect = LADDER.filter((c) => declines.filter((a) => a.config === c && a.correct).length === 6).length;
  const u4 = declines.find((a) => a.id === "u4" && a.config === CAREFUL_KEY && !a.correct);
  const u4Alone = declines.filter((a) => a.id === "u4" && a.config !== CAREFUL_KEY).every((a) => a.correct);
  const at = data.find((d) => d.at)?.at;

  const stats = BUILDS.flatMap((b) => {
    const d = data.find((x) => x.config === b.key);
    if (!d) return [];
    const rows = d.rows.filter((r) => r.same);
    const claims = rows.flatMap((r) => r.claims);
    const facts = claims.flatMap((c) => (c.cites.length ? c.facts : []));
    return [
      {
        ...b,
        answers: rows.length,
        dropped: d.rows.length - rows.length,
        facts: facts.length,
        backed: facts.filter((f) => f.inCited.length).length,
        elsewhere: facts.filter((f) => !f.inCited.length && f.inOther.length).length,
        nowhere: facts.filter((f) => !f.inCited.length && !f.inOther.length).length,
        uncited: claims.filter((c) => c.status === "uncited").length,
        flagged: rows.flatMap((r) => r.claims.filter((c) => c.status in FLAG).map((c) => ({ id: r.id, claim: c }))),
      },
    ];
  });
  const order = Object.keys(FLAG);
  const flagged = stats.flatMap((s) => s.flagged.map((f) => ({ ...f, build: s }))).sort((a, b) => order.indexOf(a.claim.status) - order.indexOf(b.claim.status));
  const careful = stats.find((s) => s.key === CAREFUL_KEY);
  const first = stats.find((s) => s.key === QUICK_KEY);
  const question = (id: string) => EVALSET.find((q) => q.id === id)?.q ?? id;

  return (
    <AiShell slug="cite-or-decline">
      <Section
        n="01"
        tone="tile"
        title="Check the receipts"
        plainTitle="Try it"
        lede="Ask anything. The bot cites a source for every fact; the page then checks, in your browser, that each number, date and code really is in the source it points to. Click a sentence to see its sources."
        plainLede="Ask a question. The AI says which file each fact came from. Then the page checks every number against that file. Click a sentence to see where it came from."
      >
        <CiteCheck />
      </Section>

      {careful && first && (
        <Section
          n="02"
          title="Every answer, audited"
          plainTitle="I checked all of them"
          lede={`The same check over the stored test-set answers of two builds${at ? `, run on ${at}` : ""}. Answers whose search no longer returns the same files are left out, so every check is against the exact sources the model saw.`}
          plainLede="The same check, run over every saved test answer from two versions of the bot."
        >
          <div className="overflow-x-auto border-[3px] border-brutal-black bg-white shadow-[6px_6px_0_0_#000]">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="bg-cream border-b-[3px] border-brutal-black">
                <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
                  <th className="px-4 py-3">&nbsp;</th>
                  <th className="px-4 py-3">{<T tech="Numbers checked" plain="Numbers checked" />}</th>
                  <th className="px-4 py-3">{<T tech="In the cited source" plain="Check out" />}</th>
                  <th className="px-4 py-3">{<T tech="Wrong source" plain="Wrong file" />}</th>
                  <th className="px-4 py-3">{<T tech="In no source" plain="Not in the files" />}</th>
                  <th className="px-4 py-3">{<T tech="Sentences without a citation" plain="No source given" />}</th>
                </tr>
              </thead>
              <tbody className="font-display tabular-nums">
                {stats.map((s) => (
                  <tr key={s.key} className="border-b-2 border-brutal-black/10 last:border-b-0">
                    <td className="px-4 py-3 font-bold">
                      <T tech={s.tech} plain={s.plain} />
                      <span className="block font-mono text-[10px] font-normal opacity-60">
                        {s.answers} answers
                        {s.dropped ? `, ${s.dropped} left out` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xl font-black">{s.facts}</td>
                    <td className="px-4 py-3 text-xl font-black">
                      {s.backed} <span className="text-sm font-bold opacity-60">({Math.round((100 * s.backed) / s.facts)}%)</span>
                    </td>
                    <td className="px-4 py-3 text-xl font-black">{s.elsewhere}</td>
                    <td className="px-4 py-3 text-xl font-black">{s.nowhere}</td>
                    <td className="px-4 py-3 text-xl font-black">{s.uncited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {flagged.map(({ id, claim, build: s }, i) => {
              const f = FLAG[claim.status as keyof typeof FLAG];
              const off = claim.facts.filter((x) => !x.inCited.length);
              return (
                <figure key={`${s.key}-${id}-${i}`} className="flex flex-col border-[3px] border-brutal-black bg-white shadow-[4px_4px_0_0_#000]">
                  <div className="flex items-center justify-between gap-2 px-3 h-9 border-b-2 border-brutal-black/15">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 border border-brutal-black" style={{ background: f.bg }}>
                      <T tech={f.tech} plain={f.plain} />
                    </span>
                    <span className="font-mono text-[10px] opacity-60 truncate">
                      <T tech={s.tech} plain={s.plain} />
                    </span>
                  </div>
                  <figcaption className="px-3 pt-2.5 font-mono text-[11px] leading-snug opacity-60">{question(id)}</figcaption>
                  <blockquote className="px-3 py-2 font-display text-[14px] leading-snug flex-1">
                    &ldquo;{claim.text}&rdquo;
                    {claim.cites.length ? <span className="font-mono text-[11px] font-bold"> {claim.cites.map((n) => `[${n}]`).join("")}</span> : null}
                  </blockquote>
                  {off.length > 0 && (
                    <p className="px-3 pb-2.5 font-mono text-[10.5px] leading-snug">
                      {off.map((x) => (
                        <span key={x.value} className="mr-2">
                          <b>{x.value}</b> {claim.status === "uncited" ? (x.inOther.length ? `is in [${x.inOther.join("][")}]` : "is in no source") : x.inOther.length ? `is really in [${x.inOther.join("][")}]` : "is in no source"}
                        </span>
                      ))}
                    </p>
                  )}
                </figure>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        n="03"
        title="When the files don't say"
        plainTitle="When the answer isn't there"
        lede={`Six questions the files can't answer, run through all six builds. The rule is one exact sentence, so code can check it. ${perfect} of 6 builds said it every time.`}
        plainLede={`Six questions the files don't answer. The right reply is \u201cI don't know\u201d. ${perfect} of the 6 versions got all six.`}
      >
        <EvalGrid configs={LADDER} answers={declines} only="unanswerable" initial={u4 ? { id: "u4", config: CAREFUL_KEY } : undefined} />
      </Section>

      <Section n="04" title="What held" plainTitle="What actually mattered">
        <Points
          items={[
            {
              title: "A citation is a claim you can check",
              plainTitle: "A source is something you can check",
              body: careful
                ? `In the audit, ${careful.backed} of ${careful.facts} numbers in the careful build's answers were in the exact source they cite. Checking took no model call and no time worth measuring. Without the check, the brackets are decoration.`
                : "Every number is checked against the source it cites. Without the check, the brackets are decoration.",
              plainBody: careful ? `${careful.backed} of ${careful.facts} numbers were really in the file the AI pointed to. The check is a few lines of code and costs nothing.` : "Every number gets checked against the file it points to.",
            },
            {
              title: "Misses are small and specific",
              plainTitle: "The mistakes are small, and you can see them",
              body: "Three kinds, all above: the right fact pinned to the wrong source, a number the model worked out itself, and a sentence with no bracket at all. None of them was an invented price. All of them are visible to code.",
              plainBody: "The right fact pointing at the wrong file, a number the AI calculated itself, a sentence with no source. Nothing invented, and all of it catchable.",
            },
            {
              title: "Say no in one exact sentence",
              plainTitle: "One fixed way to say \u201cI don't know\u201d",
              body: "\u201cI don't know based on the Northwind documents.\u201d A fixed sentence is testable, and the app can swap it for something helpful: who to ask, a link to the contact form. A loose \u201cI'm not sure, but\u2026\u201d is where invention starts.",
              plainBody: "A fixed sentence is easy to spot, so the app can replace it with \u201chere's who to ask\u201d. A vague \u201cprobably\u2026\u201d is where AI starts making things up.",
            },
          ]}
        />
      </Section>

      <Section n="05" title="The code" lede="Rendering citations against checking them." plainLede="What the two approaches do, in one sentence. The code is one click away.">
        <TechOnly plain="Most chat apps turn the AI's source numbers into links and stop there. This one checks every number against the file it points to before you see it.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Breaks" note="Links that nobody checks." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Holds" note="Every number matched against its source." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="06" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why not have a second model check the citations?" plain="Why not have another AI check it?" />}>
            <p>
              <T
                tech="For numbers, codes and dates, exact matching is free, instant and never wrong about what it matched. A judge model costs a call per answer, can itself be wrong, and needs its own test set. It earns its place on claims without a number, like “we don't write code”. That's the next layer, not the first."
                plain="For numbers, a simple text match is free and can't be fooled. Another AI costs money on every answer and can be wrong too. It's worth it for claims without numbers, later."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What happens to a failed check in production?" plain="What do you do when a check fails?" />}>
            <p>
              <T
                tech="Never nothing. Depending on the stakes: show the answer with the sentence flagged, drop the sentence, or ask again with the failing fact named. For prices and contract terms I'd hold the answer and show the source passage instead."
                plain="Never ignore it. Mark the sentence, remove it, or ask again. For prices, show the original text from the file instead."
              />
            </p>
          </Deep>
          {u4 && (
            <Deep q={<T tech="Why did the careful build miss one decline?" plain="Why did the careful version get one wrong?" />}>
              <p>
                <T
                  tech={`Asked \u201cCan we pay by credit card?\u201d, it started answering around the question, noticed, corrected itself, and ended with \u201cI don't know\u201d. The grader wants the exact sentence first, so it counts as wrong. ${u4Alone ? " It's the model, not the search: every other build declined the same question." : ""} It's in the grid above, word for word.`}
                  plain="It started answering a question the files don't cover, then caught itself and said it didn't know. Close, but the rule is to say it straight away. The full answer is in the grid above."
                />
              </p>
            </Deep>
          )}
          <Deep q={<T tech="Why are some answers left out of the audit?" plain="Why were some answers skipped?" />}>
            <p>
              <T
                tech="The audit re-runs the search behind each stored answer. The reranker isn't perfectly repeatable, so for a few questions it returned a slightly different set of files today. Checking those against different sources would be unfair either way, so they're excluded and counted in the table."
                plain="To check fairly, the search has to find the same files as when the answer was written. For a few questions it didn't, so they're left out."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}

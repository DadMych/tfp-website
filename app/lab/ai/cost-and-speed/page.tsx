import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import SpeedLab from "@/components/lab/ai/SpeedLab";
import { LEVER_LABEL, per1000 } from "@/components/lab/ai/speed-meta";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import { EVALSET } from "@/lib/rag/evalset";
import { agentCacheRuns, speedRuns, type SpeedRow } from "@/lib/rag/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cost and Speed — AI Lab",
  description: "Where the milliseconds and the cents of one RAG answer go, measured stage by stage on 78 questions, three times each. Which levers cut cost or time, and what each one did to accuracy.",
  alternates: { canonical: "/lab/ai/cost-and-speed" },
};

const ORDER = ["baseline", "rerank-10", "no-rerank", "top-3", "keyword", "warm"];
const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sec = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

function stats(rows: SpeedRow[]) {
  const answerable = rows.filter((r) => r.kind !== "unanswerable");
  return {
    n: rows.length,
    p50: pct(rows.map((r) => r.ms.total), 0.5),
    p95: pct(rows.map((r) => r.ms.total), 0.95),
    first: pct(rows.map((r) => r.ms.search + r.ms.firstToken), 0.5),
    embed: pct(rows.map((r) => r.ms.embed), 0.5),
    rerank: pct(rows.map((r) => r.ms.rerank), 0.5),
    search: pct(rows.map((r) => r.ms.search), 0.5),
    answer: pct(rows.map((r) => r.ms.answer), 0.5),
    voyage: mean(rows.map((r) => r.nano.voyage)),
    model: mean(rows.map((r) => r.nano.model)),
    input: mean(rows.map((r) => r.tokens.input)),
    rerankTokens: mean(rows.map((r) => r.tokens.rerank)),
    correct: rows.filter((r) => r.correct).length,
    hit: answerable.filter((r) => r.hit).length,
    answerable: answerable.length,
  };
}

const bad = {
  lang: "ts",
  filename: "search.ts · every candidate to the reranker",
  caption: "Hybrid search returns up to 20 candidates from each side. All of them go to the reranker, and it bills every token of every one, plus the question once per candidate.",
  code: `const fused = rrf(keywordTop20, vectorTop20);   // up to 40 chunks

const order = await voyage.rerank({
  model: "rerank-3",
  query: question,
  documents: fused.map((c) => c.text),          // all of them
  top_k: 5,
});`,
};

const good = {
  lang: "ts",
  filename: "lib/rag/search.ts · a shorter list",
  caption: "Fusion already ranks the candidates. Only the best ten go to the reranker.",
  code: `const fused = rrf(keywordTop20, vectorTop20);

const order = await voyage.rerank({
  model: "rerank-3",
  query: question,
  documents: fused.slice(0, 10).map((c) => c.text),
  top_k: 5,
});`,
};

export default async function Page() {
  const [rows, agent] = await Promise.all([speedRuns(), agentCacheRuns()]);
  const by = Object.fromEntries(ORDER.map((l) => [l, stats(rows.filter((r) => r.lever === l))]));
  const levers = ORDER.filter((l) => by[l].n > 0);
  const base = by.baseline;
  const again = stats(rows.filter((r) => r.lever === "baseline-2"));
  const cost = (l: string) => by[l].voyage + by[l].model;
  const reps = base.n ? Math.round(base.n / EVALSET.length) : 0;
  const presets = ["e1", "p1", "m1", "t1"].map((id) => EVALSET.find((q) => q.id === id)?.q).filter((q): q is string => Boolean(q));

  const turn = (cache: boolean) => {
    const rs = agent.filter((r) => r.cache === cache);
    const turns = rs.reduce((s, r) => s + r.steps, 0) || 1;
    return {
      runs: rs.length,
      steps: mean(rs.map((r) => r.steps)),
      inputNano: rs.reduce((s, r) => s + r.input * 100 + r.cacheWrite * 125 + r.cacheRead * 10, 0) / turns,
      costNano: mean(rs.map((r) => r.costNano)),
      msPerTurn: rs.reduce((s, r) => s + r.ms, 0) / turns,
      readShare: rs.reduce((s, r) => s + r.cacheRead, 0) / Math.max(1, rs.reduce((s, r) => s + r.input + r.cacheRead + r.cacheWrite, 0)),
    };
  };
  const cached = turn(true);
  const uncached = turn(false);

  // Right answers in each pass over the question set, to show how much a repeat moves on its own.
  const perRep = (l: string) => {
    const seen = new Map<string, number>();
    const out: number[] = [];
    for (const r of rows.filter((x) => x.lever === l)) {
      const i = seen.get(r.question) ?? 0;
      seen.set(r.question, i + 1);
      out[i] = (out[i] ?? 0) + (r.correct ? 1 : 0);
    }
    return out;
  };
  const voyageShare = Math.round((base.voyage / cost("baseline")) * 100);
  const saved = (l: string) => Math.round((1 - cost(l) / cost("baseline")) * 100);
  const r10 = by["rerank-10"];
  const nr = by["no-rerank"];
  const kw = by.keyword;
  const t3 = by["top-3"];
  const turnSaving = Math.round((1 - cached.inputNano / Math.max(1, uncached.inputNano)) * 100);
  const runSaving = Math.round((1 - cached.costNano / Math.max(1, uncached.costNano)) * 100);

  return (
    <AiShell slug="cost-and-speed">
      <Section
        n="01"
        tone="tile"
        title="Time it"
        plainTitle="Try it"
        lede="Ask Northwind's help bot a question. It answers twice: once with the careful setup from the RAG chapters, once with one thing changed. Every stage is timed, every token priced."
        plainLede="Ask the company's help bot a question. It answers twice: the careful way, and with one shortcut. See where the time goes and what each answer costs."
      >
        <SpeedLab presets={presets} />
      </Section>

      <Section
        n="02"
        title={`${EVALSET.length} questions, ${reps} times each`}
        plainTitle="Every shortcut, measured"
        lede="One question at a time, every setup in turn, starting from a different one each question. Times are medians and 95th percentiles. Cost is list price per 1,000 answers. Correct is graded by code against the answer key."
        plainLede="Every question was asked through every setup, three times. Time is the typical wait and the slow one-in-twenty. Cost is per thousand answers."
      >
        {levers.length ? (
          <div className="overflow-x-auto border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
            <table className="w-full min-w-[46rem] border-collapse text-[13px]">
              <thead>
                <tr className="bg-cream border-b-[3px] border-brutal-black text-left">
                  <th className={`${label} px-3 h-12`}>
                    <T tech="Setup" plain="Setup" />
                  </th>
                  <th className={`${label} px-2 text-right`}>
                    <T tech="Median" plain="Typical wait" />
                  </th>
                  <th className={`${label} px-2 text-right`}>
                    <T tech="p95" plain="Slow one" />
                  </th>
                  <th className={`${label} px-2 text-right`}>
                    <T tech="First token" plain="Starts typing" />
                  </th>
                  <th className={`${label} px-2 text-right`}>
                    <T tech="$ / 1,000" plain="1,000 answers" />
                  </th>
                  <th className={`${label} px-2 text-right`}>
                    <T tech="Voyage" plain="Search services" />
                  </th>
                  <th className={`${label} px-2 text-right`}>
                    <T tech="Model" plain="AI answer" />
                  </th>
                  <th className={`${label} px-3 text-right`}>
                    <T tech="Correct" plain="Right answers" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {levers.map((l) => {
                  const s = by[l];
                  return (
                    <tr key={l} className={`border-b-2 border-brutal-black/15 ${l === "baseline" ? "bg-brutal-yellow/25" : ""}`}>
                      <th className="px-3 py-2.5 text-left">
                        <span className="block font-display font-bold text-[14px] leading-tight">
                          <T tech={LEVER_LABEL[l].tech} plain={LEVER_LABEL[l].plain} />
                        </span>
                        <span className="block text-[12px] leading-snug text-brutal-black/65 font-normal">
                          <T tech={LEVER_LABEL[l].what} plain={LEVER_LABEL[l].whatPlain} />
                        </span>
                      </th>
                      <td className="px-2 text-right font-mono font-bold tabular-nums">{sec(s.p50)}</td>
                      <td className="px-2 text-right font-mono tabular-nums">{sec(s.p95)}</td>
                      <td className="px-2 text-right font-mono tabular-nums">{sec(s.first)}</td>
                      <td className="px-2 text-right font-mono font-bold tabular-nums">{per1000(s.voyage + s.model)}</td>
                      <td className="px-2 text-right font-mono tabular-nums">{per1000(s.voyage)}</td>
                      <td className="px-2 text-right font-mono tabular-nums">{per1000(s.model)}</td>
                      <td className="px-3 text-right font-mono font-bold tabular-nums">
                        {s.correct}/{s.n}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-display text-lg">The experiment hasn&apos;t been run on this database yet.</p>
        )}
      </Section>

      <Section
        n="03"
        title="The agent: same prompt, every turn"
        plainTitle="Same instructions, every step"
        lede={`An agent sends its tools, its instructions and everything so far on every turn. With prompt caching, the part it sent before is billed at a tenth. The inbox task from Agents That Act, ${cached.runs} runs each way.`}
        plainLede="An AI assistant that takes several steps re-sends the same instructions every step. A cache lets the provider charge a tenth for the part it has already seen."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { k: "Without cache", p: "Without the cache", s: uncached },
            { k: "With prompt cache", p: "With the cache", s: cached },
          ].map(({ k, p, s }) => (
            <div key={k} className="border-[3px] border-brutal-black bg-white p-4 shadow-[6px_6px_0_0_#000] flex flex-col gap-2">
              <span className="font-display font-bold text-[15px]">
                <T tech={k} plain={p} />
              </span>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                <dt className={`${label} opacity-60`}>
                  <T tech="Prompt cost per turn" plain="Re-reading, per step" />
                </dt>
                <dd className="font-mono font-bold tabular-nums text-right">{per1000(s.inputNano)}</dd>
                <dt className={`${label} opacity-60`}>
                  <T tech="Cost per run" plain="One whole task" />
                </dt>
                <dd className="font-mono font-bold tabular-nums text-right">{per1000(s.costNano)}</dd>
                <dt className={`${label} opacity-60`}>
                  <T tech="Time per turn" plain="Time per step" />
                </dt>
                <dd className="font-mono tabular-nums text-right">{sec(s.msPerTurn)}</dd>
                <dt className={`${label} opacity-60`}>
                  <T tech="Turns per run" plain="Steps per task" />
                </dt>
                <dd className="font-mono tabular-nums text-right">{s.steps.toFixed(1)}</dd>
              </dl>
            </div>
          ))}
        </div>
        <p className="font-display text-[15px] leading-snug max-w-3xl">
          <T
            tech={`${Math.round(cached.readShare * 100)}% of the cached agent's prompt tokens were cache reads. Prompt cost per turn fell ${turnSaving}%, cost per run ${runSaving}%: output tokens aren't cached and are five times the price. Runs differ in length, so compare per turn.`}
            plain={`With the cache, re-reading the instructions got ${turnSaving}% cheaper per step, and a whole task ${runSaving}% cheaper. The AI's writing isn't cached, which is why the saving on a whole task is smaller.`}
          />
        </p>
        <p className="text-[12.5px] text-brutal-black/70">
          <T tech="Costs are per 1,000 turns or runs, at list price, cache writes at 1.25× and reads at 0.1× of the input price." plain="Costs are per thousand, at the provider's list price." />
        </p>
      </Section>

      <Section n="04" title="What held" plainTitle="What actually mattered">
        <Points
          items={[
            {
              title: "The reranker was most of the bill",
              plainTitle: "The second opinion cost more than the answer",
              body: `${voyageShare}% of the baseline's cost per answer is Voyage, almost all of it the reranker: ${Math.round(base.rerankTokens).toLocaleString("en")} billed tokens per question against ${Math.round(base.input).toLocaleString("en")} in the model's prompt. Sending it the top 10 candidates instead of all of them cut the answer's cost by ${saved("rerank-10")}% and got ${r10.correct} of ${r10.n} right, against ${base.correct} of ${base.n}. The evidence was in the sources for ${r10.hit} of ${r10.answerable} answerable questions instead of ${base.hit}.`,
              plainBody: `${voyageShare}% of what an answer costs goes to the second AI that re-sorts the search results, not to the AI that writes the answer. Giving it a shorter list cut the cost by ${saved("rerank-10")}% with ${r10.correct} of ${r10.n} answers right, against ${base.correct} of ${base.n}.`,
            },
            {
              title: "The model's time is writing, not reading",
              plainTitle: "The AI is slow at writing, not at reading",
              body: `Generation took a median of ${sec(t3.answer)} with ${Math.round(t3.input).toLocaleString("en")} prompt tokens and ${sec(kw.answer)} with ${Math.round(kw.input).toLocaleString("en")}. Shorter prompts save money, not time. Streaming is what moves the wait: the first words appear at ${sec(base.first)}, the full answer at ${sec(base.p50)}.`,
              plainBody: `Giving the AI four times more to read barely changed how long it took. Shorter reading saves money, not time. What makes it feel faster is showing the answer as it's written: the first words after ${sec(base.first)}, the whole answer after ${sec(base.p50)}.`,
            },
            {
              title: "The fastest setup was the least right",
              plainTitle: "The quickest shortcut gave the most wrong answers",
              body: `Keyword search alone answered in ${sec(kw.p50)} with no Voyage call, and got ${kw.correct} of ${kw.n} right. It wasn't even the cheapest: its chunks are longer, so the model read ${Math.round(kw.input).toLocaleString("en")} tokens. Dropping only the reranker cost ${per1000(cost("no-rerank"))} per 1,000 and kept ${nr.correct}.`,
              plainBody: `Plain word search was the fastest and needs no extra AI service, but got ${base.correct - kw.correct} more answers wrong out of ${kw.n}. And it wasn't cheaper: the passages it finds are longer, so the AI reads more.`,
            },
          ]}
        />
      </Section>

      <Section n="05" title="The code" lede="The change that saved the most without losing answers, trimmed from the search behind the buttons." plainLede="What changed, in one sentence. The code itself is one click away.">
        <TechOnly plain="Before, every passage the search found went to the second AI for re-sorting, and it charges for every word of every passage. Now only the ten most promising go.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="06" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Where were these timed?" plain="Where were these timed?" />}>
            <p>
              <T
                tech={`From my development machine, against the same Neon database, Voyage and Anthropic APIs the site uses. A server in a data centre is closer to all three, so absolute times will be lower; the comparisons are what carry over. The live demo above runs on the site's own server. A second baseline run ${again.n ? `after the rest (${again.n} answers) had a median of ${sec(again.p50)} against ${sec(base.p50)}` : "is pending"}.`}
                plain="From my own computer, using the same services the site uses. A real server is closer to them, so its times are lower. What matters is the comparison. The demo above runs on the real server."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Are differences of a few answers real?" plain="Do a couple of extra wrong answers matter?" />}>
            <p>
              <T
                tech={`Not on their own. Each pass over the ${EVALSET.length} questions, the baseline got ${perRep("baseline").join(", ")} right; the cached-vector setup, which sends the model exactly the same thing, got ${perRep("warm").join(", ")}. That spread is the model, not the lever. Dropping the reranker scored ${perRep("no-rerank").join(", ")}: at or just below the bottom of it. Keyword search scored ${perRep("keyword").join(", ")}${Math.max(...perRep("keyword")) < Math.min(...perRep("baseline"), ...perRep("warm")) ? ", below it on every pass" : ""}.`}
                plain="Not by themselves. The same setup asked the same questions three times scores a little differently each time. Only differences bigger than that count."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why not cache the RAG prompt too?" plain="Why not use the cache for the help bot too?" />}>
            <p>
              <T
                tech="Haiku 5.5 caches prefixes of 512 tokens or more. This system prompt is 195, and the sources after it change with every question. Below the minimum the API accepts the cache flag and silently doesn't cache. The agent's prefix is its tool definitions plus everything it has done so far, well over the minimum and identical from turn to turn."
                plain="The help bot's fixed instructions are too short to be cached, and the passages it reads change with every question. The assistant re-sends the same long instructions every step, which is exactly what the cache is for."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Isn't Voyage free?" plain="Isn't the search service free?" />}>
            <p>
              <T
                tech={`The first 200 million tokens of voyage-4 and of rerank-3 are free per account. At ${Math.round(base.rerankTokens).toLocaleString("en")} rerank tokens per answer that's about ${Math.round(200e6 / base.rerankTokens / 1000).toLocaleString("en")} thousand answers before the meter starts. The table uses list price, which is what the traffic costs after that.`}
                plain={`The first part of the usage is free, roughly ${Math.round(200e6 / base.rerankTokens / 1000).toLocaleString("en")} thousand answers at this size. The prices above are what it costs after that.`}
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why is the reranker billed so much?" plain="Why does the second opinion cost so much?" />}>
            <p>
              <T
                tech="Voyage bills the question's tokens once per candidate plus every candidate's tokens. Hybrid search hands it up to 20 chunks from each side, whole sections of documents. Fusion already puts the best ones first, so the reranker mostly re-sorts the top of a list that is already roughly right."
                plain="It's charged for every word of every passage it looks at, and the search hands it dozens of long passages. Most of the good ones are already near the top, so a shorter list loses little."
              />
            </p>
          </Deep>
          <Deep q={<T tech="When was the shorter rerank list measured?" plain="Was the shorter list tested the same way?" />}>
            <p>
              <T
                tech={`After the other five, once I saw where the cost went. It ran alongside a second baseline over the same questions, ${r10.n} answers each. Cost and correctness don't depend on when they ran. For time, compare it with that second baseline: ${sec(again.p50)} median against ${sec(r10.p50)}.`}
                plain="After the others, once I saw where the money went. It was run next to a fresh copy of the careful setup, so the times are compared fairly."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}

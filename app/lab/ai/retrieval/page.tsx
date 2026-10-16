import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import RagDemo from "@/components/lab/ai/RagDemo";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { latestScores, type ConfigScore } from "@/lib/rag/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Words or Meaning — AI Lab",
  description: "Keyword search, vector search, both, and a reranker, over the same 133 company files. Switch the parts of a RAG pipeline and watch the retrieved pages and the answers change.",
  alternates: { canonical: "/lab/ai/retrieval" },
};

const bad = {
  lang: "ts",
  filename: "rag-first-try.ts",
  caption: "The build most tutorials end on. Word overlap finds product codes and nothing phrased differently. A question in German shares no words with an English price list.",
  code: `// The 5 windows sharing the most words with the question.
const hits = await sql(
  \`SELECT text FROM rag.chunks
    WHERE tsv @@ $1 ORDER BY ts_rank_cd(tsv, $1) DESC LIMIT 5\`,
  [anyWord(question)]
);

const answer = await model({ system: SYSTEM, user: sources(hits) + question });`,
};

const good = {
  lang: "ts",
  filename: "lib/rag/search.ts",
  caption: "Two searches in parallel, fused by rank, then a reranker reads every candidate against the question and keeps five. Archived files can be filtered out, or left in with a label the prompt knows about.",
  code: `// Words (Postgres full-text) and meaning (pgvector), 20 candidates each.
const [kw, vec] = await Promise.all([keyword(q, cfg), vector(await embed(q), cfg)]);

// Reciprocal rank fusion: high on either list rises.
kw.forEach((c, i) => (score[c.id] += 1 / (60 + i + 1)));
vec.forEach((c, i) => (score[c.id] += 1 / (60 + i + 1)));

// A cross-encoder re-reads each candidate with the question, keeps 5.
const top = await rerank(q, fused, 5);              // Voyage rerank-3`,
};

export default async function Page() {
  const scores = await latestScores();
  const quick = scores.find((s) => s.config === QUICK_KEY);
  const careful = scores.find((s) => s.config === CAREFUL_KEY);
  const xl = (s?: ConfigScore) => s?.byKind.crosslingual ?? [0, 0];

  return (
    <AiShell slug="retrieval">
      <Section
        n="01"
        tone="tile"
        title="Switch the parts"
        plainTitle="Try it"
        lede="The same pipeline as the bot on the lab's front page, with every part exposed. Start from the first build, change one switch, ask again."
        plainLede="This is the bot from the lab's front page with its parts on switches. Start with the quick version, change one thing, ask again. Hover a number to see where it came from."
      >
        <RagDemo scores={scores.map(({ config, retrieval, answers }) => ({ config, retrieval, answers }))} />
      </Section>

      <Section n="02" title="What holds" plainTitle="What made the difference">
        <Points
          items={[
            {
              title: "Words find codes",
              plainTitle: "Matching words",
              body: "Postgres full-text search with an OR query, ranked by cover density. Unbeatable on NW-SPR-B, invoice numbers, names. Useless when the client says \u201ctake a break\u201d and the page says \u201cpause\u201d.",
              plainBody: "Great for exact things like product codes and names. Misses the same idea in different words.",
            },
            {
              title: "Meaning finds ideas",
              plainTitle: "Matching meaning",
              body: `voyage-4 turns question and chunks into 1,024 numbers; pgvector finds the nearest. It reads across languages: keyword alone found ${xl(quick)[0]} of ${xl(quick)[1]} questions asked in Dutch, German or Russian, the careful build ${xl(careful)[0]} of ${xl(careful)[1]}.`,
              plainBody: `Turns text into numbers so similar ideas land close together, even in another language. Matching words found ${xl(quick)[0]} of ${xl(quick)[1]} questions asked in Dutch, German or Russian. Matching meaning found all of them.`,
            },
            {
              title: "Fuse, then a second look",
              plainTitle: "Use both, then double-check",
              body: "Reciprocal rank fusion merges both lists without tuning weights. A cross-encoder reranker then reads each candidate together with the question, which a single vector can't do. It costs about 300 ms.",
              plainBody: "Merge both lists, then a second model reads each candidate next to the question and keeps the best five. A third of a second, and it fixed the last misses.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the pipeline behind the switches." plainLede="What the two versions do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The quick version looks for pages that share words with the question. The careful version also looks for pages that mean the same thing, merges both lists, and has a second model re-check the best ones.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Breaks" note="Keyword only, the usual first build." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Holds" note="Hybrid with rerank, running behind the switches." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why not put all the files in the prompt?" plain="Why not just give the AI every file?" />}>
            <p>
              <T
                tech="The drive is about 57,000 words, roughly 75,000 tokens. That fits in a context window, at about $0.0075 per question on this model against about $0.0003 with 5 chunks, and it gets slower and harder to cite. It also stops working the day the drive has 2,000 files instead of 133. Retrieval is what scales; long context is a good fallback for one big document."
                plain="It would fit today, but each question would cost about 25 times more and take longer. A real company has thousands of files, not 133. Looking up the right 5 pieces first keeps working as the pile grows."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why Postgres and not a vector database?" plain="Does this need special software?" />}>
            <p>
              <T
                tech="pgvector does the vector search with an HNSW index, Postgres full-text does the keyword search, and both live next to the files in one database with one backup. At this size, and well past it, a separate vector store adds a second system to keep in sync and nothing else."
                plain="No. It runs in the ordinary database the rest of the site uses. One place for the files and the search, nothing extra to keep in sync."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why does the reranker matter if hybrid is already 97%?" plain="Why the second look, if both searches already work?" />}>
            <p>
              <T
                tech="Because the last 3% are the expensive ones: the fact that sits in one email, the table row two sections away from its heading. Fusion puts the right chunk in the top 20; the reranker moves it into the top 5 the model actually reads."
                plain="The last few misses are the ones clients notice: a fact that's only in one email. The two searches find it somewhere in the top 20. The second look moves it into the 5 the AI reads."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}

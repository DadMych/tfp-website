import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import VersionsLab, { type Probe, type Sample } from "@/components/lab/ai/VersionsLab";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { sql } from "@/lib/db";
import { EVALSET, VERSION_PROBES } from "@/lib/rag/evalset";
import { versionRuns } from "@/lib/rag/scores";
import { VARIANTS, marks, type Variant } from "@/lib/rag/versions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Old Versions — AI Lab",
  description: "Three prices for one plan in one drive. I took the defences away one at a time: the warnings, the labels, the prompt rule, the dates. What kept the bot right, and the popular fix that made it worse.",
  alternates: { canonical: "/lab/ai/old-versions" },
};

const CAREFUL = "section/hybrid/rerank/all";
const FIRST = "fixed/keyword/norerank/all";

const SAMPLES: [doc: string, heading: string][] = [
  ["pricing-2025", "Overview"],
  ["rush-and-scheduling", "Rush"],
  ["legal-msa", "7. Rush"],
];
/** Current files that state the rush fee "as at" their own date, before it went up on 1 March 2026. */
const HIDING = ["ref-glossary", "legal-msa", "legal-sow-template"];

const bad = {
  lang: "ts",
  filename: "lib/rag/search.ts · the popular fix",
  caption: "One clause and the bot can no longer see the 2025 price list. It stops quoting it by mistake, and it stops answering “what did we sign for?” at all.",
  code: `SELECT c.id, c.heading, c.text
  FROM rag.chunks c JOIN rag.docs d ON d.slug = c.doc_slug
 WHERE c.strategy = $1
   AND d.status = 'current'          -- archived files never reach the model
 ORDER BY c.embedding <=> $2
 LIMIT 20`,
};

const good = {
  lang: "ts",
  filename: "lib/rag/chunk.ts · keep the archive, date every piece",
  caption: "Archived files stay searchable. Each chunk says what it is and when it was written, and the prompt is told how to weigh that. The date did more work than the flag.",
  code: `const label = doc.status === "archived"
  ? \`\${doc.title} [ARCHIVED, updated \${doc.updated}]\`
  : \`\${doc.title} [updated \${doc.updated}]\`;

// lib/rag/answer.ts, system prompt
- If a source is marked ARCHIVED, prefer current sources;
  mention archived facts only as history.`,
};

export default async function Page() {
  const [runs, docs, chunks] = await Promise.all([
    versionRuns(),
    sql<{ slug: string; title: string; status: string; updated: string; body: string }>("SELECT slug, title, status, updated::text, body FROM rag.docs"),
    sql<{ doc: string; heading: string; text: string }>(
      `SELECT c.doc_slug AS doc, c.heading, c.text FROM rag.chunks c WHERE c.strategy = 'section' AND c.doc_slug = ANY($1)`,
      [SAMPLES.map(([d]) => d)]
    ),
  ]);

  const titles = Object.fromEntries(docs.map((d) => [d.slug, { title: d.title, archived: d.status === "archived" }]));
  const samples: Sample[] = SAMPLES.flatMap(([doc, h]) => {
    const c = chunks.find((x) => x.doc === doc && x.heading.endsWith(`› ${h}`));
    if (!c) return [];
    const views = Object.fromEntries(VARIANTS.map((v) => [v, marks(c.heading, c.text, v)])) as Sample["views"];
    return [{ doc, archived: titles[doc]?.archived ?? false, views }];
  });
  const probes: Probe[] = [
    ...[...EVALSET, ...VERSION_PROBES].filter((q) => q.kind === "stale").map((q) => ({ id: q.id, q: q.q, group: "now" as const })),
    ...VERSION_PROBES.filter((q) => q.kind === "trap").map((q) => ({ id: q.id, q: q.q, group: "then" as const })),
    ...EVALSET.filter((q) => q.kind === "trap").map((q) => ({ id: q.id, q: q.q, group: "trap" as const })),
  ];
  const hiding = HIDING.flatMap((slug) => {
    const d = docs.find((x) => x.slug === slug);
    const line = d?.body.split(/\n+/).find((l) => l.includes("25%"));
    if (!d || !line) return [];
    const text = line.replace(/^\|\s*rush\s*\|\s*/i, "").replace(/\s*\|\s*$/, "").trim();
    return [{ slug, title: d.title, updated: d.updated, text }];
  });

  const score = (build: string, v: Variant) => {
    const rs = runs.filter((r) => r.build === build && r.variant === v);
    return { ok: rs.filter((r) => r.correct).length, n: rs.length };
  };
  const bare = score(CAREFUL, "nobanner-nolabel-norule");
  const filtered = score(CAREFUL, "nobanner-current");
  const nodates = score(CAREFUL, "nodates");
  const firstNodates = runs.find((r) => r.build === FIRST && r.variant === "nodates" && r.id === "v6");

  return (
    <AiShell slug="old-versions">
      <Section
        n="01"
        tone="tile"
        title="Take the defences off"
        plainTitle="Try it"
        lede="Every old price is still in the drive. I asked 24 questions where the year matters, then took away what's supposed to keep the bot on the right version, one piece at a time. Every answer below is a stored run."
        plainLede="The old prices are all still in the files. I asked 24 questions where the year matters, then removed the safety nets one by one. Click a step and a question to read what each version said."
      >
        {runs.length > 0 ? (
          <VersionsLab runs={runs} probes={probes} samples={samples} titles={titles} />
        ) : (
          <p className="font-display text-lg">The experiment hasn&apos;t been run on this database yet.</p>
        )}
      </Section>

      {hiding.length > 0 && (
        <Section
          n="02"
          title="Where stale hides"
          plainTitle="The old number nobody archived"
          lede="The rush fee went from 25% to 40% on 1 March 2026. These three files are current. Nobody archived them, because nothing in them is wrong on the day they were written."
          plainLede="The rush fee went up on 1 March 2026. These three files are still in use, and they still say 25%. No “out of date” label will ever catch them."
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {hiding.map((h) => (
              <figure key={h.slug} className="flex flex-col border-[3px] border-brutal-black bg-white shadow-[5px_5px_0_0_#000]">
                <figcaption className="px-4 py-3 border-b-[3px] border-brutal-black bg-cream flex items-center justify-between gap-3">
                  <span className="font-display font-bold text-sm leading-snug">{h.title}</span>
                  <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 bg-[#C6FF3D] border-2 border-brutal-black">Current</span>
                </figcaption>
                <blockquote className="px-4 py-4 font-mono text-[12.5px] leading-relaxed flex-1">{h.text}</blockquote>
                <div className="px-4 py-2.5 border-t-2 border-brutal-black/15 font-mono text-[11px] flex justify-between">
                  <span className="opacity-60">updated</span>
                  <span className="font-bold tabular-nums">{h.updated}</span>
                </div>
              </figure>
            ))}
          </div>
          <p className="font-display text-base md:text-lg leading-snug max-w-3xl">
            <T
              tech="The only thing that tells these apart from the rush page is the date: written in January, superseded in March. With dates in place the careful build answered 40% every time. With dates erased and asked plainly for the rush fee, it opened with “the sources give different rush fee rates depending on the date” before calling 40% current. Asked about a rush confirmed on 3 March, it said it couldn't tell whether 25% or 40% applied."
              plain="Only the dates tell them apart from the newer rush page. With the dates, the careful bot said 40% every time. Without them, it said the files disagree, and for a rush booked on 3 March it couldn't say which fee applied."
            />
          </p>
        </Section>
      )}

      <Section n="03" title="What held" plainTitle="What actually mattered">
        <Points
          items={[
            {
              title: "The flag was the weakest part",
              plainTitle: "The “old” label hardly mattered",
              body: `With the warnings cut, the labels gone and the prompt rule deleted, the careful build still got ${bare.ok} of ${bare.n}. These files say what they cover in plain prose: “prices for agreements signed in 2025”, “from 1 March 2026”. The model reads that.`,
              plainBody: `Remove every “this is old” warning and the careful version still got ${bare.ok} of ${bare.n} right. The files say which year they're about, and the AI reads that.`,
            },
            {
              title: "Hiding the archive breaks history",
              plainTitle: "Hiding old files backfires",
              body: `Filtering archived files out of the search took the careful build to ${filtered.ok} of ${filtered.n}. The misses are the questions an account lead actually asks: what we charged in 2024, how many revision rounds 2024 work included, what the old FAQ promised.`,
              plainBody: `Hiding old files dropped it to ${filtered.ok} of ${filtered.n}. It could no longer answer “what did we pay in 2024?”, which is exactly what clients with old contracts ask.`,
            },
            {
              title: "Dates do the work",
              plainTitle: "Dates do the real work",
              body: `With every year and date erased, the careful build still scored ${nodates.ok} of ${nodates.n} by the key, but read the answers: it starts listing conflicts instead of resolving them.${firstNodates && !firstNodates.correct ? " The first build quoted 25% for a rush confirmed in March." : ""}`,
              plainBody: `Erase the dates and the careful version mostly still gets there, but it starts saying “the files disagree”.${firstNodates && !firstNodates.correct ? " The quick one gave last year's rush fee for a rush booked this March." : ""}`,
            },
          ]}
        />
      </Section>

      <Section n="04" title="The code" lede="The common fix against what this bot runs." plainLede="What the two approaches do, in one sentence. The code is one click away.">
        <TechOnly plain="The usual fix hides old files from the AI. What works better is keeping them, and making sure every piece says what it is and when it was written.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Breaks" note="Filter the archive out of search." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Holds" note="Keep it, label it with a date, tell the model how to weigh it." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="So labels are useless?" plain="So the labels are pointless?" />}>
            <p>
              <T
                tech="On these files, close to it, because the files describe their own scope. Plenty of real drives don't: a price list called “prices-final-v3.pdf” with no year. There, the label and the date in it are all the model has. They cost 15 to 25 tokens a chunk. Keep them."
                plain="Here, nearly, because these files say which year they're about. Many real files don't. Then the label is all the AI has to go on, and it costs almost nothing."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How do you catch the 25% in the contract template?" plain="How do you catch an old number in a current file?" />}>
            <p>
              <T
                tech="Not with a status flag: the file is current. Two things help. At ingest, flag sentences that tie a number to a moment (“currently”, “as at the date of”, “on the date of this page”) and show them to whoever owns the price. And keep volatile numbers in one place: the template should point at the rate card instead of repeating it."
                plain="A label won't do it, the file is still in use. Better: keep each price in one place, and have other files point to it instead of copying it."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is 24 questions enough to say this?" plain="Is 24 questions enough?" />}>
            <p>
              <T
                tech="Enough to show a direction, not to measure a rate. Each step is one run, stored as it came out, not re-run until it looked right. The misses are specific questions you can open above, so you can judge them yourself."
                plain="Enough to see a pattern, not to promise a percentage. Each step was run once and stored as it came out. You can read every answer above."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why not just delete the old files?" plain="Why not just delete old files?" />}>
            <p>
              <T
                tech="For the same reason the filter fails: someone will ask about a contract signed under them. If a document is truly dead, delete it. If anyone might still be bound by it, keep it, archived and dated."
                plain="Because some clients are still on old prices. If nobody could ever need it, delete it. If someone might, keep it and date it."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}

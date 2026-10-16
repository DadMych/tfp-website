import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import ChunkingDemo from "@/components/lab/ai/ChunkingDemo";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";

export const metadata: Metadata = {
  title: "Where to Cut — AI Lab",
  description: "Fixed 400-character windows against one chunk per section, on real company files: a price table cut from its heading, an email split mid-sentence, and what the model sees in each piece.",
  alternates: { canonical: "/lab/ai/chunking" },
};

const bad = {
  lang: "ts",
  filename: "lib/rag/chunk.ts · fixedChunks",
  caption: "The usual first attempt. Fast, simple, and blind to structure: a table row lands in one window and its header in the previous one, and no window knows which file or year it came from.",
  code: `export function fixedChunks(doc: Doc): Chunk[] {
  const text = doc.body.replace(/\\s+/g, " ");
  const out: Chunk[] = [];
  for (let start = 0, ord = 0; start < text.length; start += 400 - 50, ord++) {
    const piece = text.slice(start, start + 400).trim();
    out.push({ strategy: "fixed", docSlug: doc.slug, ord, heading: "", text: piece });
    if (start + 400 >= text.length) break;
  }
  return out;
}`,
};

const good = {
  lang: "ts",
  filename: "lib/rag/chunk.ts · sectionChunks",
  caption: "One chunk per \u201c## \u201d section, tables kept whole. Every chunk carries a label with the file's title, date and ARCHIVED flag, and the label is searched and sent to the model with the text.",
  code: `export function sectionChunks(doc: Doc): Chunk[] {
  const parts = doc.body.split(/^## /m);
  const intro = parts[0].replace(/^# .*$/m, "").trim();
  const sections = parts.slice(1).map((p) => {
    const nl = p.indexOf("\\n");
    return { h: p.slice(0, nl).trim(), body: p.slice(nl + 1).trim() };
  });
  if (intro) sections.unshift({ h: "Overview", body: intro });

  const label = doc.status === "archived"
    ? \`\${doc.title} [ARCHIVED, updated \${doc.updated}]\`
    : \`\${doc.title} [updated \${doc.updated}]\`;
  return sections.map((s, ord) => ({
    strategy: "section", docSlug: doc.slug, ord,
    heading: \`\${label} › \${s.h}\`, text: s.body,
  }));
}`,
};

export default function Page() {
  return (
    <AiShell slug="chunking">
      <Section
        n="01"
        tone="tile"
        title="Cut a file"
        plainTitle="Try it"
        lede="The same file, cut both ways, straight from the bot's index. Pick a file and a fact, and see which piece holds it and what else that piece knows."
        plainLede="One file, cut into pieces two ways. These are the real pieces the bot searches. Pick a fact and see whether its piece still says where it came from."
      >
        <ChunkingDemo />
      </Section>

      <Section n="02" title="What holds" plainTitle="What made the difference">
        <Points
          items={[
            {
              title: "A chunk is all the model sees",
              plainTitle: "The AI only sees the piece",
              body: "The model never opens the file. It gets five chunks and the question. If \u201c\u20ac5,200\u201d arrives without \u201c2025\u201d and \u201carchived\u201d, nothing in the prompt says it's last year's price.",
              plainBody: "The AI doesn't read the whole file, only the pieces it's handed. If a price arrives without its year, it has no way to know it's out of date.",
            },
            {
              title: "Cut where the writer did",
              plainTitle: "Cut where the headings are",
              body: "Documents already have structure: headings, tables, email replies. Cutting on \u201c## \u201d keeps a table and its header together and never splits a word. Sections vary in size, which matters less than it sounds.",
              plainBody: "Files already come in sections. Cutting there keeps tables whole and sentences in one piece.",
            },
            {
              title: "Label every piece",
              plainTitle: "Put the name on every piece",
              body: "Prefixing each chunk with its title, date and status costs 15 to 25 tokens. It makes the chunk searchable by the file's name and lets the prompt rule \u201cprefer current over ARCHIVED\u201d actually work.",
              plainBody: "A few extra words per piece: the file's name, its date, and whether it's out of date. That's what lets the AI pick the current price over the old one.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Both chunkers, as they run in the ingest script." plainLede="What the two versions do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The quick version slices every file into equal pieces of 400 characters. The careful version cuts at each heading and writes the file's name and date at the top of every piece.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Breaks" note="Fixed windows with overlap." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Holds" note="One labelled chunk per section, running behind the bot." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Wouldn't smaller or bigger windows fix it?" plain="Why not just make the pieces bigger?" />}>
            <p>
              <T
                tech="Bigger windows split fewer tables and make each chunk vaguer, so search gets worse at telling them apart. Smaller ones match more precisely and lose more context. Any fixed size is wrong for some file; the structure the writer gave it is right for most."
                plain="Bigger pieces split fewer tables but make search fuzzier. Smaller ones lose the label. No single size fits every file. The file's own headings usually do."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What about files without headings?" plain="What if a file has no headings?" />}>
            <p>
              <T
                tech="Here a file with no \u201c## \u201d becomes one chunk, which is fine for an email or a Slack thread of a few hundred words. For long unstructured text you'd split on paragraphs up to a size limit and still put the label on each piece."
                plain="Then the whole file is one piece, which is fine for an email. A long file without headings gets split by paragraph, still with its name on every piece."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Does the overlap help?" plain="Why repeat text between pieces?" />}>
            <p>
              <T
                tech="A little: a sentence cut at the boundary shows up whole in one of two windows. It doesn't bring back a heading 600 characters up. In the test set, on the same vector search, moving from fixed windows to sections took the answers from 95% to 98% right."
                plain="So a sentence cut at the edge appears whole in at least one piece. It doesn't fix a price that's far from its heading."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}

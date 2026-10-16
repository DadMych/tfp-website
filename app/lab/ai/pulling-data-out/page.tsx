import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import ExtractGrid, { type Column, type Miss } from "@/components/lab/ai/ExtractGrid";
import ExtractLab from "@/components/lab/ai/ExtractLab";
import { BUILD_LABEL, show } from "@/components/lab/ai/extract-meta";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { sql } from "@/lib/db";
import { BUILDS, FIELDS, KEY, gradeRecord, prove, type Rec } from "@/lib/extract";
import { extractRuns } from "@/lib/rag/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pulling Data Out — AI Lab",
  description: "18 client email threads into CRM records, three ways, 54 runs each, graded field by field against a hand-written key. The strict form that made it worse, and the proof that fixed it without catching a single misfiled value.",
  alternates: { canonical: "/lab/ai/pulling-data-out" },
};

const bad = {
  lang: "ts",
  filename: "lib/extract.ts · a strict form",
  caption: "Types, allowed values, null allowed, the same description as the plain prompt. The model stopped leaving the contact empty and wrote the company's name into it.",
  code: `contact: {
  anyOf: [{ type: "string" }, { type: "null" }],
  description: "Full name of the person writing on the
    client's side. Null if no person is named.",
},
// tool: { name: "save_record", strict: true, … }`,
};

const good = {
  lang: "ts",
  filename: "lib/extract.ts · a form with proof",
  caption: "Every field comes with the words that show it, and code checks them. It fixed the contact. It doesn't know whether a real number is in the right box.",
  code: `contact: {
  value: { anyOf: [{ type: "string" }, { type: "null" }] },
  quote: "The exact words from the thread that show
          this value. Null only if the value is null.",
},

export function prove(field, value, quote, thread) {
  if (value == null) return "null";
  if (!quote) return "no-quote";
  if (!flat(thread).includes(flat(quote))) return "not-in-thread";
  return inQuote(field, value, quote) ? "verified" : "value-not-in-quote";
}`,
};

const keyText = (v: unknown) => (Array.isArray(v) ? v.map(show).join(" or ") : show(v));

export default async function Page() {
  const [runs, docs] = await Promise.all([extractRuns(), sql<{ slug: string; title: string; body: string }>("SELECT slug, title, body FROM rag.docs WHERE slug = ANY($1) ORDER BY slug", [Object.keys(KEY)])]);
  const titles = new Map(docs.map((d) => [d.slug, d.title]));
  const bodies = new Map(docs.map((d) => [d.slug, d.body]));
  const fields = [...FIELDS];
  const keys = Object.fromEntries(Object.entries(KEY).map(([slug, k]) => [slug, Object.fromEntries(FIELDS.map((f) => [f, keyText(k[f])]))]));

  const columns: Column[] = BUILDS.map((build) => {
    const rs = runs.filter((r) => r.build === build);
    const misses: Record<string, Miss[]> = {};
    let perfect = 0;
    for (const r of rs) {
      const a = JSON.parse(r.answer) as { record: Rec; quotes: Record<string, string | null> | null };
      const g = gradeRecord(r.slug, a.record)!;
      if (FIELDS.every((f) => g[f] === "right")) perfect++;
      for (const f of FIELDS) {
        if (g[f] === "right") continue;
        const quote = a.quotes?.[f] ?? null;
        (misses[f] ??= []).push({ title: titles.get(r.slug) ?? r.slug, got: show(a.record[f]), key: keys[r.slug][f], grade: g[f], quote, proof: a.quotes ? prove(f, a.record[f], quote, bodies.get(r.slug) ?? "") : null });
      }
    }
    return { build, records: rs.length, perfect, misses };
  });

  const col = (b: string) => columns.find((c) => c.build === b)!;
  const wrong = (b: string) => Object.values(col(b).misses).reduce((s, m) => s + m.length, 0);
  const total = (b: string) => col(b).records * FIELDS.length;
  const parseErrors = runs.filter((r) => r.build === "prose" && JSON.parse(r.answer).error).length;
  const contact = (b: string) => col(b).misses.contact?.length ?? 0;
  const evMisses = Object.values(col("evidence").misses).flat();
  const evVerified = evMisses.filter((m) => m.proof === "verified").length;
  let flaggedRight = 0;
  let rightFields = 0;
  for (const r of runs.filter((x) => x.build === "evidence")) {
    const a = JSON.parse(r.answer) as { record: Rec; quotes: Record<string, string | null> };
    const g = gradeRecord(r.slug, a.record)!;
    for (const f of FIELDS) {
      if (g[f] !== "right") continue;
      rightFields++;
      const p = prove(f, a.record[f], a.quotes?.[f], bodies.get(r.slug) ?? "");
      if (p !== "verified" && p !== "null") flaggedRight++;
    }
  }
  const halden = col("evidence").misses.price_eur?.filter((m) => m.got === "3800").length ?? 0;
  const reps = Math.round(col("evidence").records / Object.keys(KEY).length);
  const threads = docs.map((d) => ({ slug: d.slug, title: d.title, body: d.body }));

  return (
    <AiShell slug="pulling-data-out">
      <Section
        n="01"
        tone="tile"
        title="Fill the record"
        plainTitle="Try it"
        lede="Pick a client thread from Northwind's inbox, or paste your own. The same model fills the same eight CRM fields three ways. For Northwind's threads you also see the answer key I wrote by hand."
        plainLede="Pick an email from the company's inbox, or paste one. The AI fills in a customer record three different ways. You can see the right answers next to them."
      >
        <ExtractLab threads={threads} fields={fields} keys={keys} />
      </Section>

      <Section
        n="02"
        title="Three builds, every field graded"
        plainTitle="How often each one got it wrong"
        lede={`18 threads, three runs each, so ${col("prose").records} records per build and ${total("prose")} fields. Each field is compared with the key by code. Click a number to see every miss.`}
        plainLede="Every email was run three times through each version. Each box counts the mistakes in one field. Click it to see what the AI wrote and what was right."
      >
        {runs.length > 0 ? <ExtractGrid fields={fields} columns={columns} initial={["contact", "schema"]} /> : <p className="font-display text-lg">The experiment hasn&apos;t been run on this database yet.</p>}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BUILDS.map((b, i) => (
            <li key={b} className="border-[3px] border-brutal-black bg-white p-3 flex flex-col gap-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Build {i + 1}</span>
              <span className="font-display font-bold text-[15px] leading-tight">
                <T tech={BUILD_LABEL[b].tech} plain={BUILD_LABEL[b].plain} />
              </span>
              <span className="font-display text-[13.5px] leading-snug">
                <T tech={BUILD_LABEL[b].what} plain={BUILD_LABEL[b].whatPlain} />
              </span>
              <span className="mt-auto pt-2 font-mono text-[12px] font-bold tabular-nums">
                {total(b) - wrong(b)}/{total(b)} {b === "prose" ? "fields right" : ""}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section n="03" title="What held" plainTitle="What actually mattered">
        <Points
          items={[
            {
              title: "Plain JSON was already good",
              plainTitle: "Just asking worked well",
              body: `Fields described in the prompt, JSON written as text: ${total("prose") - wrong("prose")} of ${total("prose")} fields right, and ${parseErrors} of ${col("prose").records} replies failed to parse. On clean email text, this model doesn't need much help with the shape.`,
              plainBody: `Simply describing the fields and asking got ${total("prose") - wrong("prose")} of ${total("prose")} answers right.${parseErrors === 0 ? " The AI never once sent back something the computer couldn't read." : ""}`,
            },
            {
              title: "The strict form made it worse",
              plainTitle: "The strict form backfired",
              body: `Same descriptions, as a strict tool schema: ${col("schema").perfect} of ${col("schema").records} records fully right, against ${col("prose").perfect} for plain JSON. Most of it is one field. Asked for a person, the model wrote the company's name, one of Northwind's own staff, or “<UNKNOWN>” into contact: ${contact("schema")} times. I re-ran a few threads with strict mode off and it did the same.`,
              plainBody: `As a fill-in form, the AI got far fewer records fully right: ${col("schema").perfect} of ${col("schema").records}. When no person was named, it wrote the company's name in the “who wrote” box instead of leaving it empty.`,
            },
            {
              title: "Asking for proof fixed it",
              plainTitle: "Asking for proof fixed it",
              body: `Add a quote to every field and contact went from ${contact("schema")} misses to ${contact("evidence")}. My guess: no sentence in the thread shows “Atlas HR” is a person, so there was nothing to quote. ${col("evidence").perfect} of ${col("evidence").records} records fully right.`,
              plainBody: `Once the AI had to show the words that prove each answer, the “who wrote” mistakes nearly vanished: ${contact("schema")} down to ${contact("evidence")}.`,
            },
            {
              title: "Proof says it's real, not that it's in the right box",
              plainTitle: "Proof can't spot a number in the wrong box",
              body: `${evVerified} of the ${evMisses.length} wrong values in the proof build came with a quote that checks out. The model didn't invent them, it misfiled them: “the €3,800 cover the review” went in as the price of the fixes ${halden} of ${reps} times, and “move from Studio to Starter” gave Starter as the plan they're on.`,
              plainBody: `Every wrong answer came with real words from the email. The AI didn't make things up; it put a real number in the wrong place, like the price of a job the client already bought.`,
            },
            {
              title: "And it flags right answers",
              plainTitle: "It also raises false alarms",
              body: `${flaggedRight} of ${rightFields} right fields failed the quote check. Mostly dates: the model quoted the last message instead of the line with its date. Then names, where it quoted a sign-off like “Best, Sandra”. Those go to a person. That's the cost of the check: review time, not accuracy.`,
              plainBody: `About one right answer in ${Math.round(rightFields / Math.max(flaggedRight, 1))} got flagged because its proof was weak. A person has to look at those.`,
            },
          ]}
        />
      </Section>

      <Section n="04" title="The code" lede="The strict form against the form with proof." plainLede="What the two approaches do, in one sentence. The code is one click away.">
        <TechOnly plain="A strict fill-in form made the AI worse at leaving boxes empty. Asking for the exact words behind every answer fixed that, but it can't tell when a real number is in the wrong box.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Made it worse" note="Strict schema, same descriptions." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Held" note="A quote per field, checked in code." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Where does the answer key come from?" plain="Who decided the right answers?" />}>
            <p>
              <T
                tech="I wrote it by hand from each thread: 8 fields, 18 threads, shown next to every record above. The rules are in the field descriptions, the same text every build gets. I widened one entry after the run: Brightlane asking whether they pay the old or the new rush fee counts as rush or price. The €3,800 stays wrong: the email says it covers the review, and the client asked about the fixes."
                plain="I did, by reading each email. They're shown next to every answer above, so you can disagree. I changed one after the run, where two answers were both fair."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why would a schema make it worse?" plain="Why would a form make it worse?" />}>
            <p>
              <T
                tech="I don't know for sure. What I can see: in the tool call, the From line “Atlas HR” gets read as the person writing, and the description saying “null if no person is named” didn't stop it. As free text, the same model left it null. That's this model on these threads; check yours before you assume a schema helps."
                plain="I can't say for certain. In the form, the AI treated the company name at the top of the email as the person. Written as text, it didn't. Test this on your own emails before assuming a form is safer."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What would catch a misfiled value?" plain="How would you catch a number in the wrong box?" />}>
            <p>
              <T
                tech="Rules about the business, in code. In a downgrade, the current plan can't be the plan they're moving to. A price that matches something the client already bought shouldn't land on a new question. A date after the last message can't be the last message. I haven't built or measured these here."
                plain="Simple business rules written as code: a client moving to a smaller plan can't already be on it, a price for something already bought isn't a new quote. I haven't tested these here."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is 18 threads enough?" plain="Is 18 emails enough?" />}>
            <p>
              <T
                tech="Enough to show a direction, not to promise a rate. Every record is stored as it came out, one batch, three runs per thread. The misses are listed above with the key next to them."
                plain="Enough to see a pattern, not to promise a percentage. Every answer is from one run, stored as it came out, and you can read them all above."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What about PDFs and scans?" plain="What about PDFs and scanned paper?" />}>
            <p>
              <T
                tech="This is clean text. A scanned contract goes through text recognition first, and its mistakes arrive before the model sees anything. Then the quote check matters more, not less: it's how you find the field that came from a misread line."
                plain="These emails are clean text. Scans have to be turned into text first, which adds its own mistakes. Then checking the proof matters even more."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}

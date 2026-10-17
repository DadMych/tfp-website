import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Workspace from "@/components/lab/ai/Workspace";
import { ExplainProvider, ExplainToggle, T } from "@/components/lab/money/Explain";
import { liveArticles } from "@/lib/ai-lab";
import { getLiveDemo } from "@/lib/lab-config";
import { EVALSET } from "@/lib/rag/evalset";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { latestScores } from "@/lib/rag/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab/ai", "AI Lab — Northwind Studio", "A made-up design studio, three years of its paperwork, and a support bot that answers from it. Open the files, ask the bot, see every step. Then read how each part works.");

const PEOPLE = [
  ["Oleksij van Koeropatkin", "Founder, studio director"],
  ["Vladislava Wolinska", "Head of PR"],
  ["Maksim Ryzjikov", "Operations and finance"],
  ["Vladimir Posjivalov", "Senior lawyer"],
  ["Sofie Milkova", "Lawyer"],
  ["Vladislav Boerdonos", "Account lead"],
  ["Sandra Tsapljoek", "Account lead"],
  ["Michiel Dembitski", "Design systems lead"],
  ["Varvara Handoga", "Senior designer, brand"],
  ["Vlas Koerbatski", "Senior designer, web"],
  ["Tomás Pereira", "Senior designer, product"],
  ["Kwame Mensah", "Senior designer, motion"],
  ["Noor Hassan", "Designer"],
  ["Leon Pavlov", "Designer"],
  ["Eva de Groot", "Designer"],
  ["Yara Haddad", "Junior designer"],
] as const;

const COLORS = ["#FFE600", "#FF5CAA", "#C6FF3D", "#B79CFF", "#FF8A3D", "#4ECDC4"];

/** What changed, and the paper it left behind. Every one is a way for a bot to be confidently wrong. */
const TIMELINE: { when: string; what: string; trap: string; plainTrap: string }[] = [
  { when: "2024", what: "Studio retainer €4,800 a month. Three revision rounds, €400 for an extra one.", trap: "The 2024 price list is still in the drive.", plainTrap: "The old price list never got deleted." },
  { when: "Jan 2025", what: "New prices: Studio €5,200. Two revision rounds, €450 for an extra.", trap: "The 2025 list applies to 2025 contracts until renewal.", plainTrap: "Last year's prices still apply to some clients." },
  { when: "May 2025", what: "Harbor, the client portal, launches. In February 2026 its \u201cWaiting for client\u201d status becomes \u201cIn review\u201d.", trap: "Older files still use the old status name.", plainTrap: "Older files still call it by its old name." },
  { when: "Oct 2025", what: "A draft proposes Studio €6,200, Partner €12,000. Rejected on 4 November.", trap: "Never adopted, still in the drive, right next to the real prices.", plainTrap: "A price proposal that was turned down is still in the files." },
  { when: "Dec 2025", what: "An urgent line for Studio clients, agreed in October, is reversed.", trap: "Meeting notes say yes, later notes say no.", plainTrap: "One meeting says yes, a later one says no." },
  { when: "Jan 2026", what: "Studio €5,800. New Partner plan at €11,200. Annual discount 15% → 10%.", trap: "Three different Studio prices across three years of files.", plainTrap: "Three different prices for the same plan, all in the files." },
  { when: "Mar 2026", what: "Rush fee 25% → 40%. A rush confirmed in February keeps 25%.", trap: "Which rate applies depends on the date of an email.", plainTrap: "Which price applies depends on the date of an email." },
  { when: "Mar 2026", what: "One client gets two months of hour rollover, once. Policy stays one month.", trap: "It lives in a Slack thread and a meeting note. It isn't policy.", plainTrap: "A one-off favour, written down in team chat. Not a new rule." },
  { when: "Apr 2026", what: "Harbor is down for 3 hours 20 minutes. No files lost.", trap: "The details are only in a postmortem and meeting notes.", plainTrap: "The facts are only in internal reports." },
];

/** Every chapter, in reading order. Slugs in the AI registry link when live; the rest say Soon. */
const PARTS: { title: string; plain: string; chapters: { slug?: string; title: string; line: string }[] }[] = [
  {
    title: "Answering from documents",
    plain: "Answering from the files",
    chapters: [
      { slug: "chunking", title: "Where to Cut", line: "Equal pieces or sections, and what a price table looks like after each." },
      { slug: "retrieval", title: "Words or Meaning", line: "Keyword, vector, both, and a second look. Switch the parts, ask again." },
      { slug: "old-versions", title: "Old Versions", line: "Three prices for one plan. Which safety net actually keeps the bot on the right one." },
      { slug: "cite-or-decline", title: "Cite or Decline", line: "Every number checked against its source, and \u201cI don't know\u201d when it isn't there." },
      { slug: "test-set", title: "Prove It", line: "65 questions with an answer key. Every change is a re-run, not a vibe." },
    ],
  },
  {
    title: "Putting it to work",
    plain: "Giving the AI real jobs",
    chapters: [
      { slug: "poisoned-files", title: "Poisoned Files", line: "One file hides an instruction. Does the bot follow it?" },
      { slug: "pulling-data-out", title: "Pulling Data Out", line: "Client emails into CRM fields, with the evidence attached." },
      { slug: "agents-that-act", title: "Agents That Act", line: "Send the email, clean up the CRM. What the guards stop, and what they cost in approvals." },
      { slug: "cost-and-speed", title: "Cost and Speed", line: "Where the milliseconds and the cents go, and how to cut both." },
    ],
  },
];

const initials = (n: string) =>
  n
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

export default async function AiLabPage() {
  if (!getLiveDemo("ai")) notFound();
  const live = new Set(liveArticles.map((a) => a.slug));
  const scores = await latestScores();
  const pct = (k: string) => {
    const a = scores.find((s) => s.config === k)?.answers;
    return a == null ? null : `${Math.round(a * 100)}%`;
  };
  const [quick, careful] = [pct(QUICK_KEY), pct(CAREFUL_KEY)];

  return (
    <ExplainProvider>
      <Navigation />
      <main className="bg-cream text-brutal-black overflow-x-clip">
        {/* Hero */}
        <section className="bg-grid pt-28 md:pt-36 pb-12 md:pb-16 border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-brutal-black/60">
                <Link href="/lab" className="hover:underline underline-offset-4">Lab</Link>
                <span aria-hidden="true">/</span>
                <span className="text-brutal-black">AI Lab</span>
              </nav>
              <ExplainToggle />
            </div>
            <h1 className="font-display font-black uppercase tracking-[-0.06em] leading-[0.8]" style={{ fontSize: "clamp(3rem, 10.5vw, 9.5rem)" }}>
              <span className="block" style={{ textShadow: "0.05em 0.05em 0 #FF5CAA" }}>
                I made up
              </span>
              <span className="inline-block whitespace-nowrap -rotate-1 bg-brutal-yellow border-[4px] border-brutal-black px-[0.08em] mt-[0.12em] shadow-[10px_10px_0_0_#000]">a company.</span>
            </h1>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-8 lg:gap-14 items-end">
              <p className="font-display text-xl md:text-2xl leading-snug max-w-3xl">
                <T
                  tech="An AI lab needs a real company's paperwork, and no client hands theirs over for a demo. So I invented one and simulated three years of its work. Northwind Studio now has 140 files that contradict each other the way every company drive does. Everything in this lab runs on them."
                  plain="To show how AI handles a company's documents, I needed a company. No client lends theirs for a demo, so I invented one and simulated three years of its work. Now it has 140 files, and like every company's files, they don't all agree."
                />
              </p>
              <dl className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.5fr)] border-[3px] border-brutal-black bg-white shadow-[6px_6px_0_0_#000]">
                {[
                  ["140", "files"],
                  ["4", "languages"],
                  [quick && careful ? <>{quick}<span className="mx-1 font-mono font-bold text-[0.6em] align-middle">→</span>{careful}</> : "65", quick && careful ? "right answers, quick → careful" : "test questions"],
                ].map(([v, k], i) => (
                  <div key={String(k)} className={`px-4 py-4 flex flex-col gap-1 min-w-0 ${i ? "border-l-[3px] border-brutal-black" : ""}`}>
                    <dt className="sr-only">{k}</dt>
                    <dd className="font-display font-black text-2xl md:text-3xl leading-none tracking-[-0.04em] tabular-nums whitespace-nowrap">{v}</dd>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-60 leading-tight">{k}</span>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* The company */}
        <section className="border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-10 lg:gap-14">
            <div className="flex flex-col gap-6">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-60">The company</span>
              <div className="relative border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] p-6 md:p-7 flex flex-col gap-5">
                <span className="absolute -top-3 right-5 rotate-2 bg-[#FF5CAA] border-[3px] border-brutal-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Fictional</span>
                <div className="flex flex-col gap-2">
                  <h2 className="font-display font-black uppercase tracking-[-0.04em] text-4xl md:text-5xl leading-[0.9]">Northwind Studio</h2>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] opacity-60">Design agency · Rotterdam · since 2017</p>
                </div>
                <p className="font-display text-base md:text-lg leading-relaxed">
                  <T
                    tech="A sixteen-person studio designing for software companies: brand identity, websites, design systems, product design. Retainers and fixed-price sprints, clients across Europe and North America, a client portal called Harbor. No code, no apps, no ads."
                    plain="A studio of sixteen that makes logos, websites and app designs for software companies. Clients pay monthly or per project, mostly remote. They don't write code."
                  />
                </p>
                <dl className="grid grid-cols-2 gap-px bg-brutal-black border-[3px] border-brutal-black">
                  {[
                    ["Clients", "10, from legal tech to energy"],
                    ["Plans", "Starter, Studio, Partner"],
                    ["Files", "Help pages to Slack threads"],
                    ["Languages", "English, Dutch, German, Spanish"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white px-3 py-2.5 flex flex-col gap-0.5">
                      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-50">{k}</dt>
                      <dd className="font-display text-sm font-bold leading-snug">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="font-mono text-[11px] leading-relaxed opacity-60">Not a real company. The people, the clients and the money are made up; any resemblance is an accident.</p>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-60">The team</span>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                  {PEOPLE.map(([name, role], i) => (
                    <li key={name} className="flex items-center gap-2.5 border-2 border-brutal-black bg-white px-2 py-1.5 min-w-0">
                      <span className="shrink-0 w-8 h-8 flex items-center justify-center border-2 border-brutal-black font-display font-black text-xs" style={{ background: COLORS[i % COLORS.length] }}>
                        {initials(name)}
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="font-display font-bold text-[13px] leading-tight">{name}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.06em] leading-snug opacity-60">{role}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-60">Three years, one drive</span>
                <h2 className="font-display font-black uppercase tracking-[-0.04em] text-3xl md:text-5xl leading-[0.9]">
                  <T tech="Every change left a paper trail." plain="Every change left old paper behind." />
                </h2>
                <p className="font-display text-base md:text-lg leading-relaxed opacity-80 max-w-2xl">
                  <T
                    tech="Prices changed three times, a proposal was rejected, a decision was reversed, one client got an exception. Nobody deleted the old files. That's the realistic part, and it's what breaks most AI assistants."
                    plain="Prices went up, plans changed, one client got a favour. Nobody cleaned up the old files, like in every real company. That's exactly what trips up an AI."
                  />
                </p>
              </div>
              <ol className="flex flex-col border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
                {TIMELINE.map((e, i) => (
                  <li key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)] md:grid-cols-[6.5rem_minmax(0,1fr)] border-b-2 border-brutal-black/15 last:border-b-0">
                    <span className="px-3 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] tabular-nums border-r-2 border-brutal-black/15">{e.when}</span>
                    <div className="px-4 py-3 flex flex-col gap-1">
                      <span className="font-display text-[15px] font-bold leading-snug">{e.what}</span>
                      <span className="font-mono text-[11px] leading-snug text-[#B0005A]">
                        ↳ <T tech={e.trap} plain={e.plainTrap} />
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* What RAG is, for founders */}
        <section className="border-b-[3px] border-brutal-black bg-brutal-black text-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col gap-12 md:gap-16">
            <div className="flex flex-col gap-6">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-cream/60">
                <T tech="Retrieval-augmented generation" plain="If you've heard the word and nodded along" />
              </span>
              <h2 className="font-display font-black uppercase tracking-[-0.06em] leading-[0.8]" style={{ fontSize: "clamp(3.5rem, 12vw, 11rem)" }}>
                This is <span className="inline-block bg-brutal-yellow text-brutal-black px-[0.08em] -rotate-1 shadow-[0.06em_0.06em_0_0_#FF5CAA]">RAG.</span>
              </h2>
              <p className="font-display text-xl md:text-3xl leading-snug max-w-4xl">
                <T
                  tech="Retrieval-augmented generation: search your documents first, then let the model answer from what the search found, and only from that."
                  plain="Before the AI answers, it looks things up in your company's files. Then it answers from what it found, and only from that. That's the whole idea."
                />
              </p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 border-[3px] border-cream">
              {[
                ["Look it up", "A client asks “what's your rush fee?”. The system searches all 140 files and picks the five pieces most likely to hold the answer.", "Keyword + vector search, reranked, top 5 chunks."],
                ["Hand it over", "Those five pieces and the question go to the AI, with strict rules: use only this, say where each fact came from.", "System prompt + numbered sources + question."],
                ["Answer with receipts", "The AI writes a short answer with a source on every fact. If the pieces don't say, it says “I don't know”.", "Citations checked by code; fixed decline sentence."],
              ].map(([t, body, tech], i) => (
                <li key={t} className={`flex flex-col gap-4 p-6 md:p-7 ${i ? "border-t-[3px] md:border-t-0 md:border-l-[3px] border-cream" : ""}`}>
                  <span className="flex items-center gap-3">
                    <span className="w-9 h-9 flex items-center justify-center bg-brutal-yellow text-brutal-black font-display font-black text-lg">{i + 1}</span>
                    <span className="font-display font-black uppercase tracking-[-0.03em] text-2xl leading-none">{t}</span>
                  </span>
                  <p className="font-display text-base md:text-lg leading-snug text-cream/85">{body}</p>
                  <p className="mt-auto font-mono text-[11px] uppercase tracking-[0.1em] text-brutal-yellow min-h-[1lh]">
                    <T tech={tech} plain="" />
                  </p>
                </li>
              ))}
            </ol>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              {[
                [
                  "Why not just ChatGPT?",
                  "ChatGPT knows the internet. It doesn't know your price list, your contract terms or what you promised a client last Tuesday. Ask it anyway and it will guess, confidently.",
                ],
                [
                  "Why not train an AI on our files?",
                  "Training is slow, costs real money, and is out of date the day your prices change. With RAG the AI reads the current files every time. Change a file, and the next answer changes.",
                ],
                [
                  "Where it pays off",
                  "A support bot over your help pages. A sales assistant that knows every proposal. Search over the handbook, contracts and old email threads, so new hires stop asking the same five people.",
                ],
              ].map(([q, a]) => (
                <div key={q} className="flex flex-col gap-3 border-t-[3px] border-cream pt-5">
                  <h3 className="font-display font-black uppercase tracking-[-0.03em] text-2xl leading-none">{q}</h3>
                  <p className="font-display text-base md:text-lg leading-snug text-cream/80">{a}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 border-[3px] border-brutal-yellow p-6 md:p-8">
              <p className="font-display font-black uppercase tracking-[-0.03em] text-2xl md:text-4xl leading-[0.95] md:max-w-md shrink-0">The catch</p>
              <p className="font-display text-base md:text-lg leading-snug text-cream/85">
                A demo takes an afternoon. Making it right takes the rest: finding the right page among similar ones, picking this year&apos;s price over last year&apos;s, saying &ldquo;I don&apos;t know&rdquo; instead of guessing, and proving all of it with tests. That&apos;s what the bot below and the chapters after it are about.
              </p>
            </div>
          </div>
        </section>

        {/* The workspace */}
        <section className="border-b-[3px] border-brutal-black bg-brutal-yellow">
          <div className="max-w-[90rem] mx-auto px-3 sm:px-6 lg:px-8 py-14 md:py-20 flex flex-col gap-8">
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-4">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
                <span className="inline-block px-1.5 py-0.5 mr-2 bg-brutal-black text-cream">Live</span>
                <T tech="Retrieval-augmented support bot" plain="A support bot that reads the files" />
              </span>
              <h2 className="font-display font-black uppercase tracking-[-0.05em] text-4xl md:text-6xl leading-[0.85]">
                <T tech="Ask it. Open the files. See inside." plain="Ask it. Check its homework." />
              </h2>
              <p className="font-display text-base md:text-lg leading-snug max-w-3xl opacity-85">
                <T
                  tech={`A real model answering from the drive on the left. The first build is what most tutorials end on; the careful one is what I'd ship. On the ${EVALSET.length}-question test set they score ${quick ?? "–"} and ${careful ?? "–"}. The X-ray on the right shows every stage of whichever answer you pick.`}
                  plain={`A real AI answers from the files on the left. The quick version is how most people build it; the careful one is how I would. On my ${EVALSET.length} test questions they got ${quick ?? "–"} and ${careful ?? "–"} right. The right side shows what each one did.`}
                />
              </p>
            </div>
            <Workspace chapters={[...live]} />
          </div>
        </section>

        {/* Chapters */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 flex flex-col gap-12">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-60">
                <T tech="How it's built" plain="How it works" />
              </span>
              <h2 className="font-display font-black uppercase tracking-[-0.05em] text-4xl md:text-6xl leading-[0.85]">
                <T tech="Same bot, one part at a time." plain="One part at a time." />
              </h2>
              <p className="font-display text-base md:text-lg leading-snug max-w-3xl opacity-80">
                <T
                  tech="Part 1 takes the bot above apart, one stage at a time: change it, and see what that does to the answers. Part 2 puts it to work: files you didn't write, records to fill, actions to take, and the bill. Same company, same files throughout."
                  plain="Part 1 opens up the bot above, one piece at a time. Change it, ask again, see what happens. Part 2 gives it real jobs: strange files, customer records, sending emails, and what it all costs. Same company all the way through."
                />
              </p>
            </div>
            {PARTS.map((part, pi) => (
              <div key={part.title} className="flex flex-col gap-4">
                <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em] flex items-center gap-3">
                  <span className="px-1.5 py-0.5 bg-brutal-black text-cream">Part {pi + 1}</span>
                  <T tech={part.title} plain={part.plain} />
                </h3>
                <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {part.chapters.map((c, ci) => {
                    const on = c.slug && live.has(c.slug);
                    const inner = (
                      <>
                        <span className="flex items-center justify-between gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                          <span>
                            {pi + 1}.{ci + 1}
                          </span>
                          <span className={`px-1.5 py-0.5 border-2 border-brutal-black ${on ? "bg-brutal-black text-brutal-yellow" : ""}`}>{on ? "Open" : "Soon"}</span>
                        </span>
                        <span className="font-display font-black uppercase tracking-[-0.03em] text-2xl md:text-3xl leading-[0.95]">{c.title}</span>
                        <span className="font-display text-sm leading-snug opacity-75">{c.line}</span>
                      </>
                    );
                    return (
                      <li key={c.title}>
                        {on ? (
                          <Link
                            href={`/lab/ai/${c.slug}`}
                            className="h-full min-h-[11rem] flex flex-col gap-3 border-[3px] border-brutal-black bg-white p-5 shadow-[6px_6px_0_0_#000] hover:bg-brutal-yellow hover:-translate-y-0.5 transition-[transform,background-color] duration-150"
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div className="h-full min-h-[11rem] flex flex-col gap-3 border-[3px] border-dashed border-brutal-black/40 p-5 text-brutal-black/60">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </ExplainProvider>
  );
}

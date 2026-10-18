import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import Link from "next/link";
import PartHub from "@/components/lab/PartHub";
import Workspace from "@/components/lab/ai/Workspace";
import { T } from "@/components/lab/money/Explain";
import { liveArticles } from "@/lib/ai-lab";
import { EVALSET } from "@/lib/rag/evalset";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { latestScores } from "@/lib/rag/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab/ai", "AI Lab — Northwind Studio", "A made-up design studio, three years of its paperwork, and a support bot that answers from it. Open the files, ask the bot, see every step. Then read how each part works.");

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

/** One line per chapter for the cards; longer than a title, shorter than the registry's lede. */
const LINES: Record<string, string> = {
  chunking: "Equal pieces or sections, and what a price table looks like after each.",
  retrieval: "Keyword, vector, both, and a second look. Switch the parts, ask again.",
  "old-versions": "Three prices for one plan. Which safety net actually keeps the bot on the right one.",
  "cite-or-decline": "Every number checked against its source, and \u201cI don't know\u201d when it isn't there.",
  "test-set": "65 questions with an answer key. Every change is a re-run, not a vibe.",
  "poisoned-files": "One file hides an instruction. Does the bot follow it?",
  "pulling-data-out": "Client emails into CRM fields, with the evidence attached.",
  "agents-that-act": "Send the email, clean up the CRM. What the guards stop, and what they cost in approvals.",
  "cost-and-speed": "Where the milliseconds and the cents go, and how to cut both.",
};

export default async function AiLabPage() {
  const live = new Set(liveArticles.map((a) => a.slug));
  const scores = await latestScores();
  const pct = (k: string) => {
    const a = scores.find((s) => s.config === k)?.answers;
    return a == null ? null : `${Math.round(a * 100)}%`;
  };
  const [quick, careful] = [pct(QUICK_KEY), pct(CAREFUL_KEY)];

  return (
    <PartHub
      slug="ai"
      base="/lab/ai"
      chapters={liveArticles}
      lines={LINES}
      note={{ kicker: "Keep scrolling", title: "The bot itself is below.", items: ["What RAG is, in three steps", "The files it reads, and where they disagree", "Ask it anything, open every file it reads"], arrow: "down", href: "#more" }}
    >
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

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-10 lg:gap-14">
              <div className="flex flex-col gap-4">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-yellow">What it reads · 140 files, three years</span>
                <h3 className="font-display font-black uppercase tracking-[-0.04em] text-3xl md:text-5xl leading-[0.9]">
                  <T tech="Every change left a paper trail." plain="Every change left old paper behind." />
                </h3>
                <p className="font-display text-base md:text-lg leading-relaxed text-cream/80 max-w-2xl">
                  <T
                    tech="Prices changed three times, a proposal was rejected, a decision was reversed, one client got an exception. Nobody deleted the old files. That's the realistic part, and it's what breaks most AI assistants."
                    plain="Prices went up, plans changed, one client got a favour. Nobody cleaned up the old files, like in every real company. That's exactly what trips up an AI."
                  />
                </p>
                <p className="font-display text-base md:text-lg leading-relaxed text-cream/80 max-w-2xl">
                  <T
                    tech="Help pages, the staff handbook, client emails, meeting notes, Slack threads, contracts, proposals, price lists, reports. Some in Dutch, German and Spanish. All 140 are in the bot below: open any of them from the list on its left."
                    plain="Help pages, the staff handbook, emails with clients, meeting notes, team chat, contracts, proposals, price lists. Some in Dutch, German and Spanish. All 140 are in the bot below: open any of them from the list on its left."
                  />
                </p>
                <p className="mt-2 font-display text-base md:text-lg leading-snug">
                  Northwind Studio is a made-up design agency.{" "}
                  <Link href="/lab#company" className="whitespace-nowrap font-mono text-xs font-bold uppercase tracking-[0.2em] border-b-[3px] border-cream hover:bg-brutal-yellow hover:text-brutal-black hover:border-brutal-yellow">
                    Meet the company →
                  </Link>
                </p>
              </div>
              <ol className="self-start flex flex-col border-[3px] border-cream bg-white text-brutal-black shadow-[8px_8px_0_0_#FFE600]">
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
                A demo takes an afternoon. Making it right takes the rest: finding the right page among similar ones, picking this year&apos;s price over last year&apos;s, saying &ldquo;I don&apos;t know&rdquo; instead of guessing, and proving all of it with tests. That&apos;s what the bot below and the chapters above are about.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 border-[3px] border-[#FF5CAA] p-6 md:p-8">
              <p className="font-display font-black uppercase tracking-[-0.03em] text-2xl md:text-4xl leading-[0.95] md:max-w-md shrink-0">
                On purpose: <span className="text-[#FF5CAA]">it reads everything</span>
              </p>
              <p className="font-display text-base md:text-lg leading-snug text-cream/85">
                <T
                  tech="This bot searches every file in the drive, internal ones included: the handbook, team chat, meeting notes, the list of clients who must never be named in public. Nothing stops it from quoting them to a client. I left it that way so the lab can show everything. A bot for real clients only gets the files the person asking is allowed to see."
                  plain="This bot reads every file in the drive, including the internal ones: the staff handbook, team chat, meeting notes, even the list of clients who must never be named in public. Nothing stops it from telling a client what's in them. I left it that way so you can see everything. A bot for real clients only gets the files the person asking is allowed to see."
                />
              </p>
            </div>

            <a
              href="#bot"
              className="inline-flex items-center gap-3 border-[3px] border-cream bg-brutal-yellow text-brutal-black px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-[6px_6px_0_0_#FF5CAA] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#FF5CAA] transition-[transform,box-shadow] w-fit"
            >
              Ask the bot <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        {/* The workspace: on lg+, exactly one screen tall under the nav and the Parts strip */}
        <section id="bot" className="scroll-mt-[7.5rem] bg-brutal-yellow">
          <div className="max-w-[90rem] mx-auto px-3 sm:px-6 lg:px-8 py-5 md:py-6 flex flex-col gap-4 lg:h-[min(calc(100svh-7.5rem),62rem)]">
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)] gap-2 lg:gap-10 lg:items-end">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
                  <span className="inline-block px-1.5 py-0.5 mr-2 bg-brutal-black text-cream">Live</span>
                  <T tech="Retrieval-augmented support bot" plain="A support bot that reads the files" />
                </span>
                <h2 className="font-display font-black uppercase tracking-[-0.05em] text-3xl md:text-5xl leading-[0.85]">
                  <T tech="Ask it. See inside." plain="Ask it. Check its homework." />
                </h2>
              </div>
              <p className="font-display text-sm md:text-base leading-snug max-w-3xl opacity-85">
                <T
                  tech={`A real model answering from the drive on the left. The first build is what most tutorials end on; the careful one is what I'd ship. On the ${EVALSET.length}-question test set they score ${quick ?? "–"} and ${careful ?? "–"}. The X-ray on the right shows every stage of whichever answer you pick.`}
                  plain={`A real AI answers from the files on the left. The quick version is how most people build it; the careful one is how I would. On my ${EVALSET.length} test questions they got ${quick ?? "–"} and ${careful ?? "–"} right. The right side shows what each one did.`}
                />
              </p>
            </div>
            <Workspace chapters={[...live]} />
          </div>
        </section>
    </PartHub>
  );
}

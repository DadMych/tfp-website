import Link from "next/link";
import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "10 questions to ask before hiring a Fractional CTO",
  description:
    "Free checklist. No email gate. The questions that filter reliable fractional CTOs from the ones who'll disappear in month two.",
  alternates: { canonical: "/free" },
  openGraph: {
    title: "10 questions to ask before hiring a Fractional CTO",
    description:
      "Free checklist for non-technical founders. No email gate. The questions that filter reliable fractional CTOs from the rest.",
    url: "/free",
  },
};

type Question = {
  n: string;
  q: string;
  why: string;
  green: string;
  red: string;
};

const GROUPS: { label: string; subtitle: string; items: Question[] }[] = [
  {
    label: "Reliability",
    subtitle: "Will they actually be there in month six?",
    items: [
      {
        n: "01",
        q: "How many clients are you taking on right now?",
        why: "Fractional means split attention. 2–3 is sustainable. 5+ means you'll be in the queue every time something breaks.",
        green: "A specific number, with what each one gets in hours per week.",
        red: "Vague answer, “as many as fit”, or 6+ active retainers.",
      },
      {
        n: "02",
        q: "What's your handoff plan when this engagement ends?",
        why: "A good fractional CTO plans for their own departure. A bad one makes themselves indispensable, and you can't leave without breaking the product.",
        green: "Documentation standards, named successor, knowledge transfer scheduled.",
        red: "“We'll figure that out later” or no clear thought.",
      },
      {
        n: "03",
        q: "Can I talk to a current client?",
        why: "Best filter of all. Anyone who refuses or stalls — has a reason.",
        green: "Yes, with one or two intros within a week.",
        red: "“They're all under NDA” with no exception. Clients can usually vouch — name + two sentences is fine.",
      },
    ],
  },
  {
    label: "Competence",
    subtitle: "Can they actually do the work — not just describe it?",
    items: [
      {
        n: "04",
        q: "Show me code you wrote in the last 6 months.",
        why: "Some CTOs stopped coding years ago. That's fine — but you should know which kind you're hiring. If they claim to ship and lead, ask for both.",
        green: "Real repos, even small ones. Diffs they wrote, not just reviewed.",
        red: "Everything under NDA with no exception, or hand-waving about “high-level direction”.",
      },
      {
        n: "05",
        q: "Walk me through how you'd structure your first 30 days here.",
        why: "This separates “I have a process” from “I'll figure it out as we go.” You want a process.",
        green: "Specific phases — discovery, audit, plan, first deliverable — with rough week-by-week.",
        red: "Generic “I'll get up to speed” with no structure.",
      },
      {
        n: "06",
        q: "Who do you bring in when you need help?",
        why: "A solo fractional CTO scales to one project. Yours might need more — design, infra, mobile, QA. “I do everything myself” means you'll hit a ceiling fast.",
        green: "A small network of people they've shipped with before. Names, roles, how vetting works.",
        red: "“I do everything myself” or “I'd hire from Upwork as needed”.",
      },
    ],
  },
  {
    label: "Fit",
    subtitle: "Will this engagement survive contact with reality?",
    items: [
      {
        n: "07",
        q: "What's a project you didn't finish — and why?",
        why: "Everyone has one. People without an answer are either inexperienced or hiding something. People with a thoughtful answer have learned from it.",
        green: "Specific story, what went wrong, what they'd do differently.",
        red: "“Never had that happen” or excessive blame on client/team.",
      },
      {
        n: "08",
        q: "What kind of project would you turn down?",
        why: "Filters equal quality. A CTO who takes everything is a mercenary, not a partner. They should have opinions about where they don't belong.",
        green: "Specific filters — industry, stage, founder type, tech stack.",
        red: "“I work on anything” or “I take what pays”.",
      },
      {
        n: "09",
        q: "How do you handle disagreement with founders?",
        why: "You will disagree. Method matters. A good CTO pushes back on the call, then commits. A bad one either rolls over or fights for weeks.",
        green: "“I disagree on the call, write up my reasoning if it's serious, then commit to your decision.”",
        red: "Stories of long arguments, going around founders, or never disagreeing with anyone.",
      },
      {
        n: "10",
        q: "What does “15 hours a week” actually look like in practice?",
        why: "Hours on paper ≠ hours of attention. Get specifics about response time, deep work blocks, meeting cadence.",
        green: "Specific schedule — deep work blocks, async by default, response within X hours.",
        red: "“It depends” or “whenever you need me” without structure.",
      },
    ],
  },
];

export default function FreePage() {
  return (
    <>
      <Navigation />
      <main className="bg-cream pt-24 pb-24">
        {/* ── Hero ─────────────────────────────────── */}
        <section className="bg-cream bg-grid border-b-[3px] border-brutal-black">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                Free · No email required
              </span>
              <span className="inline-block border-[3px] border-brutal-black bg-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest rotate-1">
                For non-technical founders
              </span>
            </div>

            <h1 className="font-display font-black text-brutal-black uppercase tracking-[-0.03em] leading-[0.92]"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
            >
              10 questions to ask
              <br />
              <span className="text-brutal-black/40">before you hire</span>
              <br />
              a <mark>fractional CTO</mark>.
            </h1>

            <p className="font-display text-lg md:text-xl text-brutal-black/65 leading-relaxed max-w-2xl">
              Most non-technical founders hire their first technical leader and
              find out — too late — that the person they picked won't actually
              be there in six months. These ten questions filter the reliable
              ones from the rest. Use them on the first call.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-2">
              <a
                href="#questions"
                className="inline-flex items-center justify-center border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-wide px-6 py-3 text-base shadow-brutal hover:shadow-brutal-hover hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150"
              >
                Read the checklist ↓
              </a>
              <Link
                href="/"
                className="font-mono text-xs font-bold uppercase tracking-widest text-brutal-black/40 hover:text-brutal-black transition-colors"
              >
                ← Back to tfpdev.com
              </Link>
            </div>
          </div>
        </section>

        {/* ── Intro context ────────────────────────── */}
        <section className="bg-white border-b-[3px] border-brutal-black">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col gap-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-black/40">
              Why this list exists
            </p>
            <p className="font-display text-base md:text-lg text-brutal-black/75 leading-relaxed">
              I&apos;ve watched founders go through 2–3 fractional CTOs in a year
              before finding someone who stuck. Every story has the same shape:
              the first CTO sounded great in the sales call, then went quiet
              somewhere around month two.
            </p>
            <p className="font-display text-base md:text-lg text-brutal-black/75 leading-relaxed">
              These questions exist to surface the difference between a
              <em> sales pitch</em> and a <em>working partnership</em>. They
              don&apos;t require you to be technical. They just require you
              to listen for vague answers.
            </p>
            <p className="font-display text-base md:text-lg text-brutal-black font-bold leading-relaxed">
              Use them on the next intro call. Take notes.
              If you get vague on three or more — keep looking.
            </p>
          </div>
        </section>

        {/* ── Questions, grouped ───────────────────── */}
        <section id="questions" className="bg-cream">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 flex flex-col gap-16">
            {GROUPS.map((group, gi) => (
              <div key={group.label} className="flex flex-col gap-6">
                {/* Group header */}
                <div className="flex items-baseline gap-4 border-b-[3px] border-brutal-black pb-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-brutal-black/40">
                    {String(gi + 1).padStart(2, "0")} ·
                  </span>
                  <h2 className="font-display font-black text-2xl md:text-3xl uppercase tracking-[-0.02em] text-brutal-black">
                    {group.label}
                  </h2>
                  <span className="hidden sm:inline font-display text-sm text-brutal-black/45 italic">
                    {group.subtitle}
                  </span>
                </div>

                {/* Questions in group */}
                <div className="flex flex-col gap-5">
                  {group.items.map((item) => (
                    <article
                      key={item.n}
                      className="relative border-[3px] border-brutal-black bg-white p-6 md:p-8 grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4 md:gap-8"
                      style={{ boxShadow: "5px 5px 0px 0px #000000" }}
                    >
                      <span className="font-display font-black italic text-5xl md:text-6xl text-brutal-black/15 leading-none select-none">
                        {item.n}
                      </span>

                      <div className="flex flex-col gap-4">
                        <h3 className="font-display font-black text-xl md:text-2xl text-brutal-black leading-snug tracking-tight">
                          {item.q}
                        </h3>
                        <p className="font-display text-sm md:text-base text-brutal-black/70 leading-relaxed">
                          {item.why}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                          <div className="border-l-[3px] border-brutal-green pl-3 py-1 bg-brutal-green/5">
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-green mb-1">
                              Green flag
                            </p>
                            <p className="font-display text-sm text-brutal-black/80 leading-snug">
                              {item.green}
                            </p>
                          </div>
                          <div className="border-l-[3px] border-brutal-red pl-3 py-1 bg-brutal-red/5">
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-red mb-1">
                              Red flag
                            </p>
                            <p className="font-display text-sm text-brutal-black/80 leading-snug">
                              {item.red}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ──────────────────────────── */}
        <section className="bg-brutal-black border-t-[3px] border-brutal-black">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 flex flex-col gap-6">
            <span className="inline-block border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
              That's the list
            </span>
            <h2 className="font-display font-black uppercase tracking-[-0.03em] text-cream leading-[0.95]"
              style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
            >
              Want to use these
              <br />
              <span className="text-brutal-yellow">on me?</span>
            </h2>
            <p className="font-display text-base md:text-lg text-cream/60 leading-relaxed max-w-2xl">
              Free 15-minute intro call. No deck, no pitch. Bring this list,
              ask whichever ones you want, and decide if I&apos;m worth a
              second conversation. If not — at least you now know the
              questions for the next one.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <a
                href={siteConfig.calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-wide px-6 py-3 text-base shadow-brutal-yellow hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150"
              >
                Book a free call →
              </a>
              <a
                href={`mailto:${siteConfig.email}?subject=Fractional%20CTO%20questions`}
                className="font-mono text-sm font-bold uppercase tracking-widest text-cream/50 hover:text-brutal-yellow transition-colors"
              >
                Or email me →
              </a>
            </div>
            <p className="font-mono text-xs text-cream/30 mt-4">
              Share this list with another founder who needs it. No catch.
              tfpdev.com/free
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

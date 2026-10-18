import Link from "next/link";
import { offers } from "@/lib/data";

const FIELD = "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/50";

export default function Offers() {
  return (
    <section id="services" className="bg-cream border-b-[3px] border-brutal-black py-16 md:py-24 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 md:gap-14">
        <div className="flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            What I Do
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
            Three ways to
            <br />
            work with me.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 items-start">
          {offers.map((o) => {
            const lead = o.id === "audit";
            return (
              <article
                key={o.id}
                className={`group relative flex flex-col border-brutal-black shadow-[6px_6px_0_0_#000] ${
                  lead ? "border-[4px] lg:-translate-y-3 lg:shadow-[12px_12px_0_0_#000]" : "border-[3px]"
                }`}
                style={{ backgroundColor: o.accentHex }}
              >
                {lead && (
                  <span className="absolute -top-3 left-5 z-10 border-[3px] border-brutal-black bg-brutal-black px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-yellow">
                    Start here
                  </span>
                )}

                {/* stub — holds the terms, tears along the perforation on hover */}
                <div className="origin-bottom-left transition-transform duration-150 group-hover:-rotate-[1.5deg] group-hover:-translate-y-1">
                  <div className="px-6 pt-6 pb-4">
                    <span className="inline-block border-[2px] border-brutal-black bg-brutal-black px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-brutal-yellow">
                      {o.terms}
                    </span>
                  </div>
                </div>

                {/* perforation */}
                <div className="relative h-0">
                  <div className="border-t-[3px] border-dashed border-brutal-black/60" />
                  <span aria-hidden="true" className="absolute -left-[11px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-cream" />
                  <span aria-hidden="true" className="absolute -right-[11px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-cream" />
                </div>

                {/* body */}
                <div className="flex flex-1 flex-col gap-5 px-6 pt-6 pb-7">
                  <h3 className={`font-display font-black uppercase tracking-[-0.03em] leading-none ${lead ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}>
                    {o.name}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    <span className={FIELD}>For</span>
                    <p className="font-display text-base leading-snug text-brutal-black/85">{o.forWho}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className={FIELD}>You get</span>
                    <p className="font-display text-base leading-snug text-brutal-black/85">{o.youGet}</p>
                  </div>
                  <Link
                    href={o.proof.href}
                    className="group/link mt-auto inline-flex items-center gap-2 border-t-[2px] border-dashed border-brutal-black/30 pt-4 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:underline underline-offset-4"
                  >
                    {o.proof.label}
                    <span aria-hidden="true" className="inline-block transition-transform duration-150 group-hover/link:translate-x-1.5">→</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* solo strip — black tape across the bottom */}
        <div id="scale" className="scroll-mt-20 -rotate-1 border-[3px] border-brutal-black bg-brutal-black shadow-[6px_6px_0_0_#000] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-3 md:gap-10">
          <p className="font-display font-black text-2xl md:text-3xl uppercase tracking-[-0.02em] leading-[0.95] text-cream md:flex-shrink-0">
            I work solo.
            <br />
            <span className="text-brutal-yellow">I don&apos;t ship solo.</span>
          </p>
          <p className="font-display text-base md:text-lg leading-snug text-cream/65 max-w-xl">
            When a project needs more hands, I bring people I&apos;ve shipped with before.
          </p>
        </div>
      </div>
    </section>
  );
}

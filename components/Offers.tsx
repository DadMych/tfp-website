import Link from "next/link";
import { offers } from "@/lib/data";

const FIELD = "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/45";

export default function Offers() {
  return (
    <section id="services" className="bg-cream border-b-[3px] border-brutal-black py-16 md:py-24">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {offers.map((o) => (
            <article key={o.id} className="bg-white border-[3px] border-brutal-black shadow-brutal flex flex-col">
              <div className="h-[6px] border-b-[3px] border-brutal-black" style={{ backgroundColor: o.accentHex }} />
              <div className="p-6 md:p-7 flex flex-col gap-5 flex-1">
                <h3 className="font-display font-black text-3xl md:text-4xl uppercase tracking-[-0.03em] leading-none">{o.name}</h3>
                <span className="w-fit border-[2px] border-brutal-black bg-brutal-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-brutal-yellow">
                  {o.terms}
                </span>
                <div className="flex flex-col gap-1.5">
                  <span className={FIELD}>For</span>
                  <p className="font-display text-base leading-snug text-brutal-black/80">{o.forWho}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={FIELD}>You get</span>
                  <p className="font-display text-base leading-snug text-brutal-black/80">{o.youGet}</p>
                </div>
                <Link
                  href={o.proof.href}
                  className="group mt-auto pt-4 border-t-[2px] border-dashed border-brutal-black/20 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:underline underline-offset-4"
                >
                  {o.proof.label}
                  <span aria-hidden="true" className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div id="scale" className="scroll-mt-20 border-[3px] border-brutal-black bg-brutal-black p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-3 md:gap-10">
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

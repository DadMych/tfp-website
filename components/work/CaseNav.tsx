import Link from "next/link";
import type { WorkCase } from "@/lib/work-data";
import Button from "@/components/ui/Button";

function NavCard({ c, dir }: { c: WorkCase; dir: "prev" | "next" }) {
  const isNext = dir === "next";
  return (
    <Link
      href={`/work/${c.slug}`}
      className={`group flex flex-col gap-4 border-[3px] border-brutal-black bg-white p-6 md:p-8 shadow-brutal hover:shadow-brutal-hover hover:translate-x-[3px] hover:translate-y-[3px] transition-[transform,box-shadow] duration-150 ${
        isNext ? "md:text-right md:items-end" : ""
      }`}
    >
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60 inline-flex items-center gap-2">
        {!isNext && <span aria-hidden="true">←</span>}
        {isNext ? "Next case" : "Previous case"}
        {isNext && <span aria-hidden="true">→</span>}
      </span>
      <span className="font-mono text-xs font-bold text-brutal-black/60">{c.index}</span>
      <span className="font-display font-black uppercase tracking-[-0.03em] leading-[0.95] text-2xl md:text-3xl text-brutal-black">
        {c.title}
      </span>
      <span className="font-display text-sm text-brutal-black/60 leading-relaxed max-w-md">{c.problem}</span>
    </Link>
  );
}

export default function CaseNav({ prev, next }: { prev?: WorkCase; next?: WorkCase }) {
  return (
    <section className="bg-cream bg-grid border-t-[3px] border-brutal-black py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {prev && <NavCard c={prev} dir="prev" />}
          {next && <NavCard c={next} dir="next" />}
        </div>

        <div className="border-[3px] border-brutal-black bg-brutal-black text-cream p-8 md:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center shadow-brutal-yellow">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-yellow">
              Have something like this
            </span>
            <p className="font-display font-black uppercase tracking-[-0.03em] leading-[0.95] text-3xl md:text-5xl">
              Tell me what is broken.
              <br />
              I will tell you what I see.
            </p>
            <p className="font-display text-cream/60 max-w-xl leading-relaxed">
              30 minutes. You describe the system, I ask questions. No pitch.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-stretch">
            <Button calendly variant="primary" size="lg" className="border-brutal-yellow">
              Book a call
            </Button>
            <Link
              href="/work"
              className="inline-flex items-center justify-center border-[3px] border-cream/30 text-cream font-display font-bold uppercase tracking-wide px-8 py-4 text-base hover:border-cream hover:bg-cream hover:text-brutal-black transition-colors duration-150"
            >
              All work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import CountUp from "@/components/work/CountUp";
import { type LabDemo } from "@/lib/lab-config";

export interface Stat {
  /** Two values render as "a → b". */
  values: string[];
  label: string;
}

/** Same box for numbers, skeleton and fallback, so nothing moves when the data lands. */
const BOX = "h-36 md:h-32 lg:h-full lg:min-h-[16rem] border-[3px] border-brutal-black bg-brutal-black text-cream";
const CELLS = "grid grid-flow-col auto-cols-[minmax(min-content,1fr)] lg:grid-flow-row lg:auto-rows-fr divide-x-[3px] lg:divide-x-0 lg:divide-y-[3px] divide-cream/20";
const CELL = "min-w-0 px-2.5 md:px-5 py-3 flex flex-col-reverse justify-center gap-1.5";
const VALUE = "font-mono font-bold text-base sm:text-2xl lg:text-4xl leading-none tracking-[-0.04em] tabular-nums whitespace-nowrap";
const LABEL = "font-mono text-[10px] font-bold uppercase tracking-[0.15em] leading-tight text-cream/60";

function Num({ v }: { v: string }) {
  return (
    <span className="inline-grid">
      <span className="invisible col-start-1 row-start-1">{v}</span>
      <CountUp value={v} className="col-start-1 row-start-1" />
    </span>
  );
}

export function ProofPanel({ stats }: { stats: Stat[] }) {
  return (
    <dl className={`${BOX} ${CELLS}`}>
      {stats.map((s) => (
        <div key={s.label} className={CELL}>
          <dt className={LABEL}>{s.label}</dt>
          <dd className={VALUE}>
            {s.values.map((v, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 text-[0.6em] align-middle text-cream/60">→</span>}
                <Num v={v} />
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ProofSkeleton({ cells = 3 }: { cells?: number }) {
  return (
    <div className={`${BOX} ${CELLS}`} aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className={CELL}>
          <span className="block h-[10px] w-[12ch] max-w-full bg-cream/15" />
          <span className={`${VALUE} block w-[5ch] max-w-full bg-cream/15 motion-safe:animate-pulse`}>&nbsp;</span>
        </div>
      ))}
    </div>
  );
}

export function ProofLine({ text }: { text: string }) {
  return (
    <div className={`${BOX} flex items-center px-4 md:px-6`}>
      <p className="font-mono text-xs md:text-sm font-bold uppercase tracking-[0.1em] leading-relaxed">{text}</p>
    </div>
  );
}

const MOBILE_CHAPTERS = 4;

/** One Part of the Northwind story. The title link covers the whole card; chapter links sit above it. */
export default function PartCard({ d, proof, chapters, more }: { d: LabDemo; proof: React.ReactNode; chapters: { label: string; href: string }[]; more?: { label: string; href: string } }) {
  const hidden = chapters.length - MOBILE_CHAPTERS;
  const chip = "relative z-10 hover:bg-brutal-black hover:text-cream";
  return (
    <article
      className="group relative flex flex-col gap-6 md:gap-8 border-[3px] border-brutal-black p-5 md:p-8 text-brutal-black shadow-brutal hover:shadow-brutal-hover hover:translate-x-[3px] hover:translate-y-[3px] has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-offset-4 transition-[transform,box-shadow] duration-150"
      style={{ background: d.color }}
    >
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
        <span className="px-1.5 py-0.5 bg-brutal-black text-cream">Part {d.part}</span>
        <span className="inline-flex items-center gap-2">
          Live <span className="w-2.5 h-2.5 rounded-full bg-brutal-black" aria-hidden="true" />
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 lg:gap-10">
        <div className="flex flex-col gap-4">
          <h2 className="font-display font-black uppercase tracking-[-0.05em] leading-[0.85] text-4xl sm:text-5xl md:text-7xl">
            <Link href={d.href} className="outline-none after:absolute after:inset-0">
              {d.title}
            </Link>
          </h2>
          <p className="font-display text-lg md:text-xl leading-snug max-w-2xl">{d.proves}</p>
        </div>
        {proof}
      </div>

      <nav aria-label={`Part ${d.part} chapters`} className="border-t-[3px] border-brutal-black pt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
        {chapters.map((c, i) => (
          <Link key={c.href} href={c.href} className={`${chip} ${i >= MOBILE_CHAPTERS ? "hidden md:inline" : ""}`}>
            {c.label}
          </Link>
        ))}
        {hidden > 0 && <span className="md:hidden opacity-60">+{hidden} more</span>}
        {more && (
          <Link href={more.href} className={`${chip} underline decoration-2 underline-offset-4`}>
            {more.label}
          </Link>
        )}
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-2">
          {d.stack.map((s) => (
            <li key={s} className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] border-[2px] border-brutal-black bg-cream px-2 py-0.5">
              {s}
            </li>
          ))}
        </ul>
        <span className="inline-flex items-center justify-center gap-2 w-full md:w-auto border-[3px] border-brutal-black bg-brutal-black text-cream px-5 py-3 font-display font-black uppercase tracking-[-0.02em] text-xl" aria-hidden="true">
          {d.cta}
          <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">→</span>
        </span>
      </div>
    </article>
  );
}

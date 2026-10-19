import Link from "next/link";
import { Suspense } from "react";
import BookCall from "@/components/lab/BookCall";
import ShatterMark from "@/components/ui/ShatterMark";
import { type Stat } from "@/components/lab/PartCard";
import { partHeadline } from "@/components/lab/PartProofs";
import { hero, siteConfig } from "@/lib/data";
import { getLiveDemo } from "@/lib/lab-config";

/** Same box for a number and its skeleton, so nothing moves when the data lands. */
const CELL = "h-28 sm:h-32 bg-brutal-black text-cream px-3 sm:px-5 py-3 flex flex-col-reverse justify-center gap-2";
const VALUE = "font-mono font-bold text-lg sm:text-2xl xl:text-3xl leading-none tracking-[-0.04em] tabular-nums whitespace-nowrap";
const LABEL = "font-mono text-[10px] font-bold uppercase tracking-[0.15em] leading-tight text-cream/60 line-clamp-3";

/** Final values, rendered on load — no count-up (that flashed "0 → 0" above the fold). */
function StatValueStatic({ stat }: { stat: Stat }) {
  return (
    <>
      {stat.values.map((v, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 text-[0.6em] align-middle text-cream/60">→</span>}
          {v}
        </span>
      ))}
    </>
  );
}

function ProofCell({ stat, href }: { stat: Stat; href?: string }) {
  const body = (
    <>
      <span className={LABEL}>{stat.label}</span>
      <span className={VALUE}>
        <StatValueStatic stat={stat} />
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={`${CELL} hover:bg-[#1a1a1a] transition-colors`}>
      {body}
    </Link>
  ) : (
    <div className={CELL}>{body}</div>
  );
}

async function LiveCell({ slug, href }: { slug: string; href: string }) {
  const stat = await partHeadline(slug);
  return stat && <ProofCell stat={stat} href={href} />;
}

function CellSkeleton() {
  return (
    <div className={CELL} aria-hidden="true">
      <span className="block h-[10px] w-[14ch] max-w-full bg-cream/15" />
      <span className={`${VALUE} block w-[6ch] bg-cream/15 motion-safe:animate-pulse`}>&nbsp;</span>
    </div>
  );
}

const PROOF_SLUGS = ["ai", "money", "web3"];

/** Square-cut icons (no rounded caps), so they read like the rest of the system. */
const ICON = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.25, strokeLinecap: "square", strokeLinejoin: "miter", "aria-hidden": true } as const;

function MapPinIcon() {
  return (
    <svg {...ICON} className="flex-shrink-0">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function MoveRightIcon() {
  return (
    <svg {...ICON} className="flex-shrink-0">
      <path d="M18 8l4 4-4 4" />
      <path d="M3 12h19" />
    </svg>
  );
}

/** The same jagged shape language as the "HOW IT BREAKS." crack. */
function CrackGlyph() {
  return (
    <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" className="flex-shrink-0 text-brutal-black">
      <path d="M0 6h7l3-5 4 10 3-5h6" />
    </svg>
  );
}

const PASS_STATS = [
  { n: "23", l: "Age" },
  { n: "9", l: "Yrs in tech" },
  { n: "14", l: "First line of code at" },
];

/** A studio pass, taped to the hero — square, hard, typographic. No emoji. */
function IntroCard() {
  return (
    <aside
      aria-label="About Oleksii"
      className="intro-card group relative mt-8 w-full md:max-w-[360px] lg:mt-0 lg:max-w-none rounded-none border-[3px] border-brutal-black bg-[#FFFDF5] shadow-[6px_6px_0_0_#0A0A0A] rotate-0 md:-rotate-1 lg:-rotate-2 motion-safe:transition-[transform,box-shadow] motion-safe:duration-100 motion-safe:hover:rotate-0 motion-safe:hover:shadow-[9px_9px_0_0_#0A0A0A]"
    >
      {/* yellow tape over the top edge */}
      <span
        aria-hidden="true"
        className="absolute -top-[11px] left-1/2 z-20 h-[22px] w-[90px] -translate-x-1/2 rotate-[4deg] bg-[#FFE14D]"
        style={{ clipPath: "polygon(3% 12%, 11% 0, 92% 6%, 100% 58%, 95% 100%, 7% 90%)" }}
      />

      {/* header strip */}
      <div className="flex items-center justify-between border-b-[3px] border-brutal-black bg-brutal-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-cream">
        <span>TFPDEV · PASS</span>
        <span>No. 001</span>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* identity */}
        <div className="flex items-stretch gap-4">
          <div
            aria-hidden="true"
            className="relative flex h-[84px] w-[72px] flex-shrink-0 items-center justify-center border-[3px] border-brutal-black md:h-28 md:w-24"
            style={{ background: "#FF5CAA" }}
          >
            <span className="relative font-display text-[2.25rem] font-bold leading-none text-brutal-black md:text-[2.75rem]">
              <span aria-hidden="true" className="absolute left-[2px] top-[2px] text-brutal-black/25">OK</span>
              <span className="relative">OK</span>
            </span>
          </div>

          <div className="flex min-w-0 flex-col justify-between py-0.5">
            <div className="flex flex-col">
              <span className="font-display text-[1.75rem] font-bold uppercase leading-[0.9] tracking-tight text-brutal-black">Oleksii</span>
              {/* TODO(oleksii): "Solution Architect" or "the human behind the breaking" — pick one. */}
              <span className="mt-1 font-mono text-xs text-brutal-black/55">Solution Architect</span>
            </div>
            <div className="flex flex-col gap-1 font-mono text-xs text-brutal-black/75">
              <span className="flex items-center gap-1.5"><MapPinIcon /> Barcelona</span>
              <span className="flex items-center gap-1.5">Ukraine <MoveRightIcon /> Barcelona</span>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 divide-x-[3px] divide-brutal-black border-[3px] border-brutal-black">
          {PASS_STATS.map((s) => (
            <div key={s.l} className="flex flex-col gap-1 px-3 py-3">
              <span className="font-display text-[2rem] font-bold leading-none tabular-nums text-brutal-black">{s.n}</span>
              <span className="font-mono text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-brutal-black/55">{s.l}</span>
            </div>
          ))}
        </div>

        {/* quote */}
        <p className="font-display text-[15px] font-medium leading-snug text-brutal-black">
          I break things on purpose so they don&apos;t break on you.
          <span className="ml-1.5 inline-block align-middle"><CrackGlyph /></span>
        </p>
      </div>
    </aside>
  );
}

export default function Hero() {
  const live = PROOF_SLUGS.flatMap((slug) => {
    const d = getLiveDemo(slug);
    return d ? [{ slug, href: d.href }] : [];
  });

  return (
    <section id="hero" className="bg-cream bg-grid pt-28 md:pt-36 pb-14 md:pb-20 border-b-[3px] border-brutal-black overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 lg:items-start">
          <div className="flex flex-col gap-7 md:gap-8">
            <span className="w-fit inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
              {hero.eyebrow}
            </span>

            <h1 className="font-display font-black uppercase tracking-[-0.04em] text-brutal-black max-w-6xl">
              <span className="block text-brutal-black/55 leading-[0.95] mb-4 text-balance" style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.75rem)" }}>
                {hero.lead}
              </span>
              <span className="block leading-[0.92]" style={{ fontSize: "clamp(2.4rem, 7.2vw, 6.25rem)" }}>
                {hero.punch}{" "}
                <ShatterMark className="mt-[0.06em]">{hero.mark}</ShatterMark>
              </span>
            </h1>

            <p className="font-display text-lg md:text-xl leading-snug text-brutal-black/80 max-w-3xl">{hero.sub}</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                href="/lab"
                className="inline-flex items-center justify-center gap-2 border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-[-0.01em] px-7 py-4 text-lg shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-[transform,box-shadow] duration-150"
              >
                See it break <span aria-hidden="true">→</span>
              </Link>
              <BookCall outline className="px-7 py-4 text-lg">
                Book a free {siteConfig.callMinutes}-min call
              </BookCall>
            </div>
          </div>

          <IntroCard />
        </div>

        <ul className="mt-10 md:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-[3px] bg-[#3a3a37] border-[3px] border-brutal-black">
          {live.map((p) => (
            <li key={p.slug} className="flex flex-col [&>*]:flex-1">
              <Suspense fallback={<CellSkeleton />}>
                <LiveCell slug={p.slug} href={p.href} />
              </Suspense>
            </li>
          ))}
          <li className="flex flex-col [&>*]:flex-1">
            <ProofCell stat={{ values: ["30+"], label: "projects shipped in 9 years" }} href="/work" />
          </li>
        </ul>
      </div>
    </section>
  );
}

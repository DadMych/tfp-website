import Link from "next/link";
import { Suspense } from "react";
import BookCall from "@/components/lab/BookCall";
import ShatterMark from "@/components/ui/ShatterMark";
import { StatValue, type Stat } from "@/components/lab/PartCard";
import { partHeadline } from "@/components/lab/PartProofs";
import { hero, siteConfig } from "@/lib/data";
import { getLiveDemo } from "@/lib/lab-config";

/** Same box for a number and its skeleton, so nothing moves when the data lands. */
const CELL = "h-28 sm:h-32 bg-brutal-black text-cream px-3 sm:px-5 py-3 flex flex-col-reverse justify-center gap-2";
const VALUE = "font-mono font-bold text-lg sm:text-2xl xl:text-3xl leading-none tracking-[-0.04em] tabular-nums whitespace-nowrap";
const LABEL = "font-mono text-[10px] font-bold uppercase tracking-[0.15em] leading-tight text-cream/60 line-clamp-3";

function ProofCell({ stat, href }: { stat: Stat; href?: string }) {
  const body = (
    <>
      <span className={LABEL}>{stat.label}</span>
      <span className={VALUE}>
        <StatValue stat={stat} />
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

/** A soft, human business card — the one place on the site that isn't brutal. */
function IntroCard() {
  return (
    <div className="intro-card group relative rotate-[1.4deg] rounded-[28px] bg-white border border-black/[0.06] p-7 shadow-[0_26px_60px_-26px_rgba(10,10,10,0.4)] transition-transform duration-300 hover:rotate-0">
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-[2rem] shadow-[inset_0_-6px_12px_-6px_rgba(0,0,0,0.25)]"
          style={{ background: "linear-gradient(135deg, #FF5CAA 0%, #B79CFF 55%, #4ECDC4 100%)" }}
        >
          <span className="wave-hand inline-block">👋</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-xl font-bold text-brutal-black">Hey, I&apos;m Oleksii</span>
          <span className="font-display text-sm text-brutal-black/45">the human behind the breaking</span>
        </div>
      </div>

      <p className="mt-5 font-display text-[15px] leading-relaxed text-brutal-black/70">
        I break things on purpose so they don&apos;t break on you. Originally from Ukraine&nbsp;🇺🇦, now
        building in Barcelona&nbsp;🇪🇸.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {["23 years old", "9 years in tech", "coding since 14"].map((f) => (
          <span key={f} className="rounded-full bg-black/[0.05] px-3 py-1 font-display text-xs font-medium text-brutal-black/65">
            {f}
          </span>
        ))}
      </div>
    </div>
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

          <div className="hidden lg:block lg:pt-2">
            <IntroCard />
          </div>
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

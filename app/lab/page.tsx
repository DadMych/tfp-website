import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import NorthwindDossier from "@/components/lab/NorthwindDossier";
import PartCard, { ProofSkeleton } from "@/components/lab/PartCard";
import { PART_PROOF } from "@/components/lab/PartProofs";
import { GAME_COUNT } from "@/components/lab/money/GamesHall";
import { liveArticles } from "@/lib/ai-lab";
import { getLiveDemo, labEnabled, labHero, liveDemos } from "@/lib/lab-config";
import { liveModules } from "@/lib/money-lab";
import { liveChapters } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab", "I made up a company. — Lab", labHero);

/** "2.3 Webhooks": every Part's chapters numbered the same way. */
const numbered = (part: number, base: string, items: { slug: string; title: string }[]) =>
  items.map((c, i) => ({ label: `${part}.${i + 1} ${c.title}`, href: `${base}/${c.slug}` }));

const PART: Record<string, { chapters: { label: string; href: string }[]; more?: { label: string; href: string } }> = {
  ai: {
    chapters: numbered(1, "/lab/ai", liveArticles),
  },
  money: {
    chapters: numbered(2, "/lab/money", liveModules),
    more: { label: `+ ${GAME_COUNT} games`, href: "/lab/money#games" },
  },
  web3: {
    chapters: numbered(3, "/lab/web3", liveChapters),
  },
};

export default function LabPage() {
  if (!labEnabled) notFound();
  if (liveDemos.length === 1) redirect(liveDemos[0].href);
  const parts = [...liveDemos].sort((a, b) => a.part - b.part);

  return (
    <>
      <Navigation />
      <main className="bg-cream text-brutal-black overflow-x-clip">
        <section className="bg-grid pt-28 md:pt-36 pb-12 md:pb-16 border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 md:gap-10">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brutal-black/60">Lab · Northwind Studio</span>
            <h1 className="font-display font-black uppercase tracking-[-0.06em] leading-[0.8]" style={{ fontSize: "clamp(3rem, 10.5vw, 9.5rem)" }}>
              <span className="block" style={{ textShadow: "0.05em 0.05em 0 #FF5CAA" }}>
                I made up
              </span>
              <span className="inline-block whitespace-nowrap -rotate-1 bg-brutal-yellow border-[4px] border-brutal-black px-[0.08em] mt-[0.12em] shadow-[10px_10px_0_0_#000]">a company.</span>
            </h1>
            <div className="flex flex-col gap-5">
              <p className="font-display text-xl md:text-2xl leading-snug max-w-3xl">{labHero}</p>
              {getLiveDemo("ai") && (
                <Link href="/lab#company" className="w-fit font-mono text-xs font-bold uppercase tracking-[0.2em] border-b-[3px] border-brutal-black hover:bg-brutal-yellow">
                  Meet the company →
                </Link>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 flex flex-col gap-8 md:gap-10">
            {parts.map((d) => {
              const p = PART[d.slug];
              return (
                <PartCard
                  key={d.slug}
                  d={d}
                  proof={PART_PROOF[d.slug] && <Suspense fallback={<ProofSkeleton />}>{PART_PROOF[d.slug]}</Suspense>}
                  chapters={p?.chapters ?? []}
                  more={p?.more}
                />
              );
            })}
          </div>
        </section>

        <NorthwindDossier />
      </main>
      <Footer />
    </>
  );
}

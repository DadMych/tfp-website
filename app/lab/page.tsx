import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import NorthwindDossier from "@/components/lab/NorthwindDossier";
import PartCard, { ProofLine, ProofPanel, ProofSkeleton, type Stat } from "@/components/lab/PartCard";
import { GAME_COUNT } from "@/components/lab/money/Hub";
import { aiCorpus, liveArticles } from "@/lib/ai-lab";
import { getLiveDemo, labEnabled, labHero, liveDemos } from "@/lib/lab-config";
import { readCounters } from "@/lib/lab/counters";
import { formatCents, liveModules } from "@/lib/money-lab";
import { EVALSET } from "@/lib/rag/evalset";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { latestScores } from "@/lib/rag/scores";
import { liveChapters } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab", "I made up a company. — Lab", labHero);

async function AiProof() {
  const scores = await latestScores().catch(() => []);
  const pct = (k: string) => {
    const a = scores.find((s) => s.config === k)?.answers;
    return a == null ? null : `${Math.round(a * 100)}%`;
  };
  const [quick, careful] = [pct(QUICK_KEY), pct(CAREFUL_KEY)];
  const stats: Stat[] = [
    ...(quick && careful ? [{ values: [quick, careful], label: "right answers, quick → careful" }] : []),
    { values: [String(aiCorpus.files)], label: `files · ${aiCorpus.languages} languages` },
    { values: [String(EVALSET.length)], label: "test questions" },
  ];
  return <ProofPanel stats={stats} />;
}

async function MoneyProof() {
  const c = await readCounters();
  const [attacks, taken, held] = [c.ds_attacks_total, c.ds_extracted_cents, c.ds_defended_extracted_cents ?? 0];
  if (!(attacks > 0 && taken > 0 && Number.isFinite(held))) return <ProofLine text="One $100 balance, up to 200 payments at once. See how much you can take." />;
  return (
    <ProofPanel
      stats={[
        { values: [`${attacks.toLocaleString("en-US")}×`], label: "visitors' attacks" },
        { values: [formatCents(taken)], label: "taken from the careless card" },
        { values: [formatCents(held)], label: "from the careful one" },
      ]}
    />
  );
}

/** Everything the careless books in Part 3 got wrong, in story USDC (1 test unit = 1 USDC). */
const W3_CARELESS = [
  "w3_careless_lost_units",
  "w3_careless_misattributed_units",
  "w3_careless_unmatched_units",
  "w3_careless_fake_units",
  "w3_careless_overpaid_units",
  "w3_careless_stuck_units",
];

async function Web3Proof() {
  const c = await readCounters();
  const transfers = c.w3_transfers_total ?? 0;
  const fakes = c.w3_fake_runs ?? 0;
  const careless = W3_CARELESS.reduce((s, k) => s + (c[k] ?? 0), 0);
  if (!(transfers > 0)) return <ProofLine text="Real USDC deposits on Sepolia, read straight from the chain. Seven ways to book them wrong." />;
  return (
    <ProofPanel
      stats={[
        { values: [transfers.toLocaleString("en-US")], label: "real payments on Sepolia" },
        { values: [fakes.toLocaleString("en-US")], label: "fake USDC payments caught" },
        { values: [careless.toLocaleString("en-US")], label: "USDC the careless books got wrong" },
      ]}
    />
  );
}

/** "2.3 Webhooks": every Part's chapters numbered the same way. */
const numbered = (part: number, base: string, items: { slug: string; title: string }[]) =>
  items.map((c, i) => ({ label: `${part}.${i + 1} ${c.title}`, href: `${base}/${c.slug}` }));

const PART: Record<string, { proof: React.ReactNode; chapters: { label: string; href: string }[]; more?: { label: string; href: string } }> = {
  ai: {
    proof: <AiProof />,
    chapters: numbered(1, "/lab/ai", liveArticles),
  },
  money: {
    proof: <MoneyProof />,
    chapters: numbered(2, "/lab/money", liveModules),
    more: { label: `+ ${GAME_COUNT} games`, href: "/lab/money/games" },
  },
  web3: {
    proof: <Web3Proof />,
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
                  proof={p && <Suspense fallback={<ProofSkeleton />}>{p.proof}</Suspense>}
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

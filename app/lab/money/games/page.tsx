import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import Link from "next/link";
import { notFound } from "next/navigation";
import Hub from "@/components/lab/money/Hub";
import RaceToy from "@/components/lab/play/RaceToy";
import { labEnabled } from "@/lib/lab-config";
import RetryGame from "@/components/lab/play/games/RetryGame";
import FloatGame from "@/components/lab/play/games/FloatGame";
import RefundGame from "@/components/lab/play/games/RefundGame";
import WebhookGame from "@/components/lab/play/games/WebhookGame";
import ScaleGame from "@/components/lab/play/games/ScaleGame";
import SplitGame from "@/components/lab/play/games/SplitGame";
import WorkersGame from "@/components/lab/play/games/WorkersGame";


export const metadata: Metadata = {
  ...labMeta("/lab/money/games", "Games — Money Lab", "Eight ways payment systems lose money, as games. Poke them until they break, then flip the fix."),
  robots: labEnabled ? undefined : { index: false, follow: false },
};

interface Tile {
  n: string;
  slug?: string;
  kicker: string;
  title: string;
  line: string;
  bg: string;
  ink?: string;
  wide?: boolean;
  toy: React.ReactNode;
}

const TILES: Tile[] = [
  { n: "02", slug: "idempotency", kicker: "Idempotency", title: "Retry storm", line: "The phone lost signal and retried. The customer bought one ticket.", bg: "#FF5CAA", toy: <RetryGame /> },
  { n: "03", slug: "money-math", kicker: "Money math", title: "Ten cents", line: "Add 10¢ a thousand times in floating point. Count how often the total is wrong.", bg: "#C6FF3D", toy: <FloatGame /> },
  { n: "04", slug: "state-machine", kicker: "State machine", title: "Refund twice", line: "The button was disabled in the UI. The API was not.", bg: "#FFE600", toy: <RefundGame /> },
  { n: "05", slug: "ledger", kicker: "Ledger", title: "The scale", line: "Two UPDATEs. The server dies between them.", bg: "#B79CFF", toy: <ScaleGame /> },
  { n: "06", slug: "webhooks", kicker: "Webhooks", title: "Late mail", line: "Providers deliver events late, twice and out of order. You pick the order.", bg: "#FF8A3D", wide: true, toy: <WebhookGame /> },
  { n: "07", slug: "money-math", kicker: "Money math", title: "Split the bill", line: "$100 three ways. Where does the last cent go?", bg: "#4ECDC4", toy: <SplitGame /> },
  { n: "08", kicker: "Concurrency", title: "Two workers", line: "The payout job was slow, so someone ran a second copy.", bg: "#3B5BFF", ink: "#FFFDF5", toy: <WorkersGame /> },
];


export default function GamesPage() {
  if (!labEnabled) notFound();
  return (
    <Hub tab="games">
        <section className="py-14 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
            <div id="t01" className="scroll-mt-24"><ToyHead n="01" kicker="Concurrency" title="Double-spend" line="A $100 balance. Fire payments at it faster than it can count." slug="double-spend" /></div>
            <RaceToy />
          </div>
        </section>

        <section className="pb-16 md:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            {TILES.map((t) => (
              <article
                key={t.n}
                className={`flex flex-col gap-5 border-[3px] border-brutal-black p-5 md:p-8 shadow-[10px_10px_0_0_#000] ${t.wide ? "md:col-span-2" : ""}`}
                style={{ background: t.bg, color: t.ink }}
              >
                <ToyHead n={t.n} kicker={t.kicker} title={t.title} line={t.line} slug={t.slug} small ink={t.ink} />
                <div className="flex-1 flex flex-col text-brutal-black">{t.toy}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t-[3px] border-brutal-black bg-brutal-black text-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end">
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-yellow">These are toys</span>
              <p className="font-display font-black uppercase tracking-[-0.04em] leading-[0.9] text-4xl md:text-6xl max-w-3xl">
                The real versions hit a real database.
              </p>
              <p className="font-display text-base md:text-lg text-cream/70 max-w-2xl">
                Same bugs, run against Postgres with real transactions, real locks and the SQL on screen.
              </p>
            </div>
            <Link
              href="/lab/money/articles"
              className="inline-flex items-center gap-3 border-[3px] border-cream bg-brutal-yellow text-brutal-black px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-[6px_6px_0_0_#FF5CAA] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#FF5CAA] transition-[transform,box-shadow] w-fit"
            >
              Read the articles <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
    </Hub>
  );
}

function ToyHead({ n, kicker, title, line, slug, small, ink }: { n: string; kicker: string; title: string; line: string; slug?: string; small?: boolean; ink?: string }) {
  const dim = ink ? "opacity-80" : "text-brutal-black/80";
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
          <span className={`inline-block px-1.5 py-0.5 mr-2 ${ink ? "bg-cream text-brutal-black" : "bg-brutal-black text-cream"}`}>{n}</span>
          {kicker}
        </span>
        {slug ? (
          <Link href={`/lab/money/${slug}`} className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] underline decoration-[2px] underline-offset-4 ${ink ? "hover:bg-cream hover:text-brutal-black" : "hover:bg-brutal-black hover:text-cream"}`}>
            Article →
          </Link>
        ) : (
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-60">Toy only</span>
        )}
      </div>
      <h2 className={`font-display font-black uppercase tracking-[-0.05em] leading-[0.85] ${small ? "text-4xl md:text-6xl" : "text-5xl sm:text-6xl md:text-8xl"}`}>{title}</h2>
      <p className={`font-display leading-snug ${dim} ${small ? "text-base md:text-lg min-h-[2.75em]" : "text-lg md:text-xl max-w-2xl"}`}>{line}</p>
    </header>
  );
}

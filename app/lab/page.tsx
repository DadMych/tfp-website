import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { labEnabled, liveDemos } from "@/lib/lab-config";

export const metadata: Metadata = labMeta("/lab", "Lab", "Live demos of the bugs that cost real money in production, and the code that stops them. Money Lab on Postgres, AI Lab on a real model.");

const ENTRY: Record<string, { href: string; color: string }> = {
  money: { href: "/lab/money/games", color: "#FFE600" },
  ai: { href: "/lab/ai", color: "#FF5CAA" },
};

export default function LabPage() {
  if (!labEnabled) notFound();
  if (liveDemos.length === 1) redirect(ENTRY[liveDemos[0].slug]?.href ?? `/lab/${liveDemos[0].slug}`);

  return (
    <>
      <Navigation />
      <main className="bg-cream overflow-x-clip">
        <section className="bg-grid pt-28 md:pt-36 pb-14 md:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 md:gap-14">
            <div className="flex flex-col gap-6">
              <h1 className="font-display font-black uppercase tracking-[-0.06em] leading-[0.8] text-brutal-black" style={{ fontSize: "clamp(3.5rem, 13vw, 11rem)" }}>
                <span className="inline-block rotate-[-1deg] bg-brutal-yellow border-[4px] border-brutal-black px-[0.08em] shadow-[10px_10px_0_0_#000]">Lab.</span>
              </h1>
              <p className="font-display text-xl md:text-2xl leading-snug text-brutal-black max-w-2xl">The bugs that cost real money in production, running live. Break them, then see the code that holds.</p>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {liveDemos.map((d) => {
                const e = ENTRY[d.slug] ?? { href: `/lab/${d.slug}`, color: "#FFFDF5" };
                return (
                  <li key={d.slug} className="flex">
                    <Link
                      href={e.href}
                      className="group flex-1 flex flex-col gap-5 border-[3px] border-brutal-black p-6 md:p-8 shadow-[10px_10px_0_0_#000] hover:shadow-[5px_5px_0_0_#000] hover:translate-x-[5px] hover:translate-y-[5px] transition-[transform,box-shadow] duration-150"
                      style={{ background: e.color }}
                    >
                      <h2 className="font-display font-black uppercase tracking-[-0.05em] leading-[0.85] text-5xl md:text-7xl">{d.title}</h2>
                      <p className="font-display text-lg leading-snug text-brutal-black/80">{d.proves}</p>
                      <ul className="mt-auto flex flex-wrap gap-2">
                        {d.stack.map((s) => (
                          <li key={s} className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] border-[2px] border-brutal-black bg-cream px-2 py-0.5">{s}</li>
                        ))}
                      </ul>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-2">
                        Open
                        <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5" aria-hidden="true">→</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

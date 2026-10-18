import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HubNote, { type HubNoteDef } from "./HubNote";
import { ProofSkeleton } from "./PartCard";
import { PART_PROOF } from "./PartProofs";
import { ExplainProvider, ExplainToggle, T } from "./money/Explain";
import { getLiveDemo, liveDemos } from "@/lib/lab-config";
import type { MoneyModule } from "@/lib/money-lab";

/**
 * Landing page of one Part: the same top for every Part (title, live numbers, chapters),
 * with whatever is unique to the Part passed as children under the chapters.
 */
export default function PartHub({
  slug,
  base,
  chapters,
  lines,
  note,
  children,
}: {
  slug: string;
  base: string;
  chapters: MoneyModule[];
  lines?: Record<string, string>;
  note: HubNoteDef;
  children?: React.ReactNode;
}) {
  const d = getLiveDemo(slug);
  if (!d || chapters.length === 0) notFound();
  const parts = [...liveDemos].sort((a, b) => a.part - b.part);
  const next = parts.find((p) => p.part === d.part + 1);

  return (
    <ExplainProvider>
      <Navigation />
      <main className="bg-cream text-brutal-black pt-16 overflow-x-clip">
        <div className="sticky top-16 z-40 bg-cream border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3 lg:gap-6">
            <Link href="/lab" className="hidden sm:inline font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:underline underline-offset-4">
              Lab
            </Link>
            <nav aria-label="Parts" className="flex items-center gap-1.5 min-w-0">
              {parts.map((p) => (
                <Link
                  key={p.slug}
                  href={p.href}
                  aria-current={p.slug === d.slug ? "page" : undefined}
                  className={`h-8 px-2 flex items-center border-[2px] border-brutal-black font-mono text-[11px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${p.slug === d.slug ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}
                >
                  Part {p.part}
                  <span className="hidden xl:inline">&nbsp;· {p.title.replace(/^Northwind /, "").replace(/\.$/, "")}</span>
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex-shrink-0">
              <ExplainToggle compact />
            </div>
          </div>
        </div>

        <header className="border-b-[3px] border-brutal-black py-10 md:py-14" style={{ background: d.color }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8 lg:gap-12">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
                <span className="inline-block px-2 py-1 bg-brutal-black text-cream">Part {d.part}</span>
                <span className="text-brutal-black/60">{chapters.length} chapters · live</span>
              </div>
              <h1 className="font-display font-black uppercase tracking-[-0.05em] leading-[0.85] text-balance" style={{ fontSize: "clamp(2.75rem, 7vw, 6.5rem)" }}>
                {d.part > 1 && <span className="block text-[0.45em] leading-none tracking-[-0.01em] mb-[0.2em]">And then</span>}
                {d.title}
              </h1>
              <div className="flex flex-col gap-3 max-w-2xl font-display leading-snug">
                {d.story.map((s, j) => (
                  <p key={j} className={j === 0 ? "text-xl md:text-2xl" : "text-base md:text-lg text-brutal-black/80"}>
                    <T tech={s.tech} plain={s.plain ?? s.tech} />
                  </p>
                ))}
              </div>
              <Link href="/lab#company" className="w-fit font-mono text-xs font-bold uppercase tracking-[0.2em] border-b-[3px] border-brutal-black hover:bg-brutal-black hover:text-cream">
                Meet Northwind →
              </Link>
            </div>
            {PART_PROOF[d.slug] && <Suspense fallback={<ProofSkeleton />}>{PART_PROOF[d.slug]}</Suspense>}
          </div>
        </header>

        <section id="chapters" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col gap-6">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] border-t-[3px] border-brutal-black pt-4">
              {chapters.length} chapters · read in order or jump in
            </span>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_19rem] gap-8 lg:gap-10">
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {chapters.map((m, j) => (
                <li key={m.slug} className={`flex ${j === chapters.length - 1 && chapters.length % 2 ? "sm:col-span-2" : ""}`}>
                  <Link
                    href={`${base}/${m.slug}`}
                    className="group flex-1 min-h-[12rem] flex flex-col gap-3 border-[3px] border-brutal-black bg-white p-5 shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-brutal-yellow transition-[transform,box-shadow,background-color] duration-150"
                  >
                    <span className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                      <span className="px-1.5 py-0.5 border-[2px] border-brutal-black" style={{ background: m.color, color: m.ink ?? "#000" }}>
                        {d.part}.{j + 1}
                      </span>
                      <span className="truncate text-brutal-black/60">
                        <T tech={m.kicker.replace(/^Part \d+ · /, "")} plain={(m.plainKicker ?? m.kicker).replace(/^Part \d+ · /, "")} />
                      </span>
                    </span>
                    <span className="font-display font-black uppercase tracking-[-0.03em] text-2xl md:text-3xl leading-[0.95]">{m.title}</span>
                    <span className="font-display text-sm md:text-base leading-snug text-brutal-black/75">{lines?.[m.slug] ?? <T tech={m.proves} plain={m.plain ?? m.proves} />}</span>
                    <span className="mt-auto font-mono text-[11px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-2">
                      Open <span aria-hidden="true" className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <HubNote note={note} />
            </div>
          </div>
        </section>

        {children && (
          <div id="more" className="scroll-mt-32">
            {children}
          </div>
        )}

        <Link
          href={next ? next.href : "/lab"}
          className="group block border-t-[3px] border-brutal-black hover:brightness-110 transition-[filter]"
          style={{ background: next ? next.color : undefined }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 flex flex-col gap-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-70">{next ? `Next · Part ${next.part}` : `End of Part ${d.part}`} →</span>
            <span className="font-display font-black uppercase tracking-[-0.04em] text-3xl md:text-5xl leading-[0.9]">{next ? `And then ${next.title}` : "Back to the lab"}</span>
            {next && (
              <span className="font-display text-base md:text-lg leading-snug max-w-2xl opacity-80">
                <T tech={next.story[0].tech} plain={next.story[0].plain ?? next.story[0].tech} />
              </span>
            )}
          </div>
        </Link>
      </main>
      <Footer />
    </ExplainProvider>
  );
}

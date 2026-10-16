import Link from "next/link";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getLiveDemo } from "@/lib/lab-config";
import { adjacentModules, getLiveModule, liveModules } from "@/lib/money-lab";
import { ExplainProvider, ExplainToggle, T } from "./Explain";

/**
 * Frame for every /lab/money/<module> page. Draft modules 404 here, so a
 * route file can exist in the repo without existing on the site.
 */
export default function MoneyShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const lab = getLiveDemo("money");
  const mod = getLiveModule(slug);
  if (!lab || !mod) notFound();

  const { prev, next } = adjacentModules(slug);
  const index = liveModules.findIndex((m) => m.slug === slug) + 1;
  const ink = mod.ink ?? "#000";
  const dark = Boolean(mod.ink);

  return (
    <ExplainProvider>
      <Navigation />
      <main className="bg-cream">
        <header className="border-b-[3px] border-brutal-black pt-28 md:pt-36 pb-10 md:pb-14" style={{ background: mod.color, color: ink }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
            <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] ${dark ? "text-cream/70" : "text-brutal-black/60"}`}>
              <Link href="/lab/money/games" className="hover:underline underline-offset-4">Lab</Link>
              <span aria-hidden="true">/</span>
              <Link href="/lab/money/articles" className="hover:underline underline-offset-4">Articles</Link>
              <span aria-hidden="true">/</span>
              <span style={{ color: ink }}>{mod.title}</span>
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
                <span className={`inline-block px-2 py-1 ${dark ? "bg-cream text-brutal-black" : "bg-brutal-black text-cream"}`}>
                  {String(index).padStart(2, "0")} / {String(liveModules.length).padStart(2, "0")}
                </span>
                <span className={dark ? "text-cream/70" : "text-brutal-black/60"}>{mod.kicker}</span>
              </div>
              <ExplainToggle tone={dark ? "dark" : "light"} />
            </div>

            <h1 className="font-display font-black uppercase tracking-[-0.05em] leading-[0.82]" style={{ fontSize: "clamp(3rem, 10vw, 8.5rem)" }}>
              {mod.title}
            </h1>
            <p className={`font-display text-lg md:text-2xl leading-snug max-w-3xl ${dark ? "text-cream/85" : "text-brutal-black/80"}`}>
              {mod.plain ? <T tech={mod.proves} plain={mod.plain} /> : mod.proves}
            </p>

          </div>
        </header>

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 flex flex-col gap-12 md:gap-16"
          style={{ ["--tile" as string]: mod.color, ["--ink" as string]: ink, ["--badge" as string]: dark ? "#FFFDF5" : "#000", ["--badge-ink" as string]: dark ? "#000" : "#FFFDF5" }}
        >
          {children}
        </div>

        <nav aria-label="Modules" className="border-t-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2">
            {prev ? (
              <Link href={`/lab/money/${prev.slug}`} className="group px-4 sm:px-6 lg:px-8 py-8 border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-brutal-black hover:brightness-110 transition-[filter] flex flex-col gap-2" style={{ background: prev.color, color: prev.ink ?? "#000" }}>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-70">← Previous</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">{prev.title}</span>
              </Link>
            ) : (
              <Link href="/lab/money/articles" className="group px-4 sm:px-6 lg:px-8 py-8 border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-brutal-black hover:bg-brutal-yellow transition-colors flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">← Back</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">All articles</span>
              </Link>
            )}
            {next ? (
              <Link href={`/lab/money/${next.slug}`} className="group px-4 sm:px-6 lg:px-8 py-8 hover:brightness-110 transition-[filter] flex flex-col gap-2 sm:text-right" style={{ background: next.color, color: next.ink ?? "#000" }}>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-70">Next →</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">{next.title}</span>
              </Link>
            ) : (
              <Link href="/lab/money/games" className="group px-4 sm:px-6 lg:px-8 py-8 hover:bg-brutal-yellow transition-colors flex flex-col gap-2 sm:text-right">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">Done →</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">Back to the games</span>
              </Link>
            )}
          </div>
        </nav>
        {mod.caseSlug && (
          <section className="border-t-[3px] border-brutal-black bg-cream text-brutal-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">Why this exists</span>
                <p className="font-display text-xl md:text-2xl font-bold leading-snug">{mod.caseLabel}</p>
                <p className="font-display text-base text-brutal-black/70 max-w-2xl">
                  <T
                    tech="This module is the lab version of a bug I met in production. The case page has the context, the decision and the numbers."
                    plain="This article is the toy version of a problem from a real project. The case page tells what happened and what it cost."
                  />
                </p>
              </div>
              <Link
                href={`/work/${mod.caseSlug}`}
                className="inline-flex items-center justify-center gap-2 border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black px-6 py-4 font-display font-black uppercase tracking-[-0.02em] text-xl shadow-[5px_5px_0_0_#000] hover:bg-brutal-black hover:text-brutal-yellow transition-colors w-fit"
              >
                Read the case <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </ExplainProvider>
  );
}

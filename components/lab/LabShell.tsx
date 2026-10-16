import Link from "next/link";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getLiveDemo } from "@/lib/lab-config";
import type { MoneyModule } from "@/lib/money-lab";
import { ExplainProvider, ExplainToggle, T } from "./money/Explain";

export interface LabDef {
  /** lib/lab-config.ts slug that gates the whole lab. */
  demo: string;
  /** "/lab/money" — articles live at `${base}/<slug>`, the list at `${base}/articles`. */
  base: string;
  modules: MoneyModule[];
  done: { href: string; label: string };
  /** Breadcrumb parent and the "back" link. Defaults to `${base}/articles`. */
  home?: { href: string; label: string };
  /** Show a visible TODO where an article has no /work case yet. */
  todoCase?: boolean;
}

/**
 * Frame for every lab article page. Draft modules 404 here, so a route file
 * can exist in the repo without existing on the site.
 */
export default function LabShell({ lab, slug, children }: { lab: LabDef; slug: string; children: React.ReactNode }) {
  const i = lab.modules.findIndex((m) => m.slug === slug);
  const mod = lab.modules[i];
  if (!getLiveDemo(lab.demo) || !mod) notFound();

  const prev = i > 0 ? lab.modules[i - 1] : undefined;
  const next = i < lab.modules.length - 1 ? lab.modules[i + 1] : undefined;
  const ink = mod.ink ?? "#000";
  const home = lab.home ?? { href: `${lab.base}/articles`, label: "Articles" };
  const dark = Boolean(mod.ink);

  return (
    <ExplainProvider>
      <Navigation />
      <main className="bg-cream">
        <header className="border-b-[3px] border-brutal-black pt-28 md:pt-36 pb-10 md:pb-14" style={{ background: mod.color, color: ink }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
            <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] ${dark ? "text-cream/70" : "text-brutal-black/60"}`}>
              <Link href="/lab" className="hover:underline underline-offset-4">Lab</Link>
              <span aria-hidden="true">/</span>
              <Link href={home.href} className="hover:underline underline-offset-4">{home.label}</Link>
              <span aria-hidden="true">/</span>
              <span style={{ color: ink }}>{mod.title}</span>
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
                <span className={`inline-block px-2 py-1 ${dark ? "bg-cream text-brutal-black" : "bg-brutal-black text-cream"}`}>
                  {String(i + 1).padStart(2, "0")} / {String(lab.modules.length).padStart(2, "0")}
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
              <Link href={`${lab.base}/${prev.slug}`} className="group px-4 sm:px-6 lg:px-8 py-8 border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-brutal-black hover:brightness-110 transition-[filter] flex flex-col gap-2" style={{ background: prev.color, color: prev.ink ?? "#000" }}>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-70">← Previous</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">{prev.title}</span>
              </Link>
            ) : (
              <Link href={home.href} className="group px-4 sm:px-6 lg:px-8 py-8 border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-brutal-black hover:bg-brutal-yellow transition-colors flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">← Back</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">{lab.home ? home.label : "All articles"}</span>
              </Link>
            )}
            {next ? (
              <Link href={`${lab.base}/${next.slug}`} className="group px-4 sm:px-6 lg:px-8 py-8 hover:brightness-110 transition-[filter] flex flex-col gap-2 sm:text-right" style={{ background: next.color, color: next.ink ?? "#000" }}>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-70">Next →</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">{next.title}</span>
              </Link>
            ) : (
              <Link href={lab.done.href} className="group px-4 sm:px-6 lg:px-8 py-8 hover:bg-brutal-yellow transition-colors flex flex-col gap-2 sm:text-right">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">Done →</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">{lab.done.label}</span>
              </Link>
            )}
          </div>
        </nav>
        {mod.caseSlug ? (
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
        ) : (
          lab.todoCase && (
            <section className="border-t-[3px] border-brutal-black bg-cream text-brutal-black">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col gap-3">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">Why this exists</span>
                <p className="font-mono text-sm font-bold bg-brutal-yellow border-[3px] border-brutal-black px-3 py-2 w-fit">TODO(oleksii): which project did this come from?</p>
              </div>
            </section>
          )
        )}

      </main>
      <Footer />
    </ExplainProvider>
  );
}

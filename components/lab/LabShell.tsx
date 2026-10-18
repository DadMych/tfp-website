import Link from "next/link";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getLiveDemo } from "@/lib/lab-config";
import type { MoneyModule } from "@/lib/money-lab";
import CallBox from "./CallBox";
import PartBar from "./PartBar";
import { ExplainProvider, T } from "./money/Explain";

export interface LabDef {
  /** lib/lab-config.ts slug that gates the whole lab. */
  demo: string;
  /** "/lab/money" — articles live at `${base}/<slug>`, the list at `${base}/articles`. */
  base: string;
  modules: MoneyModule[];
  done: { href: string; label: string; kicker?: string };
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
  const demo = getLiveDemo(lab.demo);
  if (!demo || !mod) notFound();

  const prev = i > 0 ? lab.modules[i - 1] : undefined;
  const next = i < lab.modules.length - 1 ? lab.modules[i + 1] : undefined;
  const ink = mod.ink ?? "#000";
  const home = lab.home ?? { href: `${lab.base}/articles`, label: "Articles" };
  const dark = Boolean(mod.ink);

  return (
    <ExplainProvider>
      <Navigation />
      <main className="bg-cream pt-16">
        <PartBar
          part={demo.part}
          title={demo.title.replace(/\.$/, "")}
          home={home.href}
          chapters={lab.modules.map((m) => ({ href: `${lab.base}/${m.slug}`, title: m.title }))}
          current={i}
        />
        <header className="border-b-[3px] border-brutal-black py-7 md:py-10" style={{ background: mod.color, color: ink }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-3 md:gap-4">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
              <span className={`inline-block px-2 py-1 ${dark ? "bg-cream text-brutal-black" : "bg-brutal-black text-cream"}`}>
                {demo.part}.{i + 1}
              </span>
              <span className={dark ? "text-cream/70" : "text-brutal-black/60"}>{mod.plainKicker ? <T tech={mod.kicker} plain={mod.plainKicker} /> : mod.kicker}</span>
            </div>
            <h1 className="font-display font-black uppercase tracking-[-0.05em] leading-[0.85]" style={{ fontSize: "clamp(2.5rem, 6.5vw, 5.75rem)" }}>
              {mod.title}
            </h1>
            <p className={`font-display text-base md:text-xl leading-snug max-w-3xl ${dark ? "text-cream/85" : "text-brutal-black/80"}`}>
              {mod.plain ? <T tech={mod.proves} plain={mod.plain} /> : mod.proves}
            </p>
          </div>
        </header>

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-14 md:pb-20 flex flex-col gap-12 md:gap-16"
          style={{ ["--tile" as string]: mod.color, ["--ink" as string]: ink, ["--badge" as string]: dark ? "#FFFDF5" : "#000", ["--badge-ink" as string]: dark ? "#000" : "#FFFDF5" }}
        >
          {children}

          <CallBox>
            {mod.caseSlug ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">Why this exists</span>
                  <p className="font-display text-lg md:text-xl font-bold leading-snug">{mod.caseLabel}</p>
                  <p className="font-display text-base text-brutal-black/70 max-w-2xl">
                    <T
                      tech="This module is the lab version of a problem from a real project. The case page has the context, the decision and the numbers."
                      plain="This article is the toy version of a problem from a real project. The case page has the real story."
                    />
                  </p>
                </div>
                <Link
                  href={`/work/${mod.caseSlug}`}
                  className="inline-flex items-center gap-2 border-[3px] border-brutal-black bg-white px-4 py-3 font-display font-black uppercase tracking-[-0.02em] text-base hover:bg-brutal-black hover:text-cream transition-colors w-fit"
                >
                  Read the case <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : (
              lab.todoCase && <p className="font-mono text-sm font-bold bg-brutal-yellow border-[3px] border-brutal-black px-3 py-2 w-fit">TODO(oleksii): which project did this come from?</p>
            )}
          </CallBox>
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
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">{lab.done.kicker ?? "Done"} →</span>
                <span className="font-display font-black uppercase text-2xl tracking-[-0.03em]">{lab.done.label}</span>
              </Link>
            )}
          </div>
        </nav>
      </main>
      <Footer />
    </ExplainProvider>
  );
}

import Link from "next/link";
import { fullCases, shortCases, workRegions } from "@/lib/work-data";
import CaseRow from "@/components/work/CaseRow";

export default function Projects() {
  return (
    <section
      id="projects"
      className="py-20 md:py-28"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ─────────────────────────── */}
        <div className="mb-8 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            Selected Work
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-cream uppercase tracking-[-0.03em]">
            30+ shipped.
            <br />
            <span className="text-brutal-yellow">Four with the full story.</span>
          </h2>
          <span className="w-fit border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
            30+ shipped · 3 current clients
          </span>
        </div>

        {/* ── Geography row ──────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-white/30 mr-1">
            Clients from:
          </span>
          {workRegions.map((loc, i) => (
            <span key={loc} className="flex items-center gap-1">
              <span className="border-[2px] border-white/20 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wide text-white/60">
                {loc}
              </span>
              {i < workRegions.length - 1 && (
                <span className="text-white/20 font-bold ml-1">·</span>
              )}
            </span>
          ))}
        </div>

        {/* ── Case rows ──────────────────────────────── */}
        <div className="border-t-[3px] border-cream/20">
          {fullCases.map((c) => (
            <CaseRow key={c.slug} c={c} tone="dark" headingLevel="h3" />
          ))}
        </div>

        {/* ── Also shipped — compact strip ───────────── */}
        {shortCases.length > 0 && (
          <div className="mt-14">
            <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
                Also shipped
              </span>
              <span className="font-mono text-[10px] text-white/25 uppercase tracking-widest">
                + more under NDA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {shortCases.map((c) => (
                <Link
                  key={c.slug}
                  href="/work"
                  className="group relative border-[3px] border-white/10 border-l-brutal-yellow border-l-[4px] bg-[#111111] p-5 flex flex-col gap-3 hover:border-white/30 hover:translate-x-[2px] hover:translate-y-[2px] transition-[transform,border-color] duration-150"
                >
                  <span className="font-mono text-[10px] font-bold text-white/55 uppercase tracking-widest">
                    {c.region}
                  </span>
                  <h3 className="font-display font-black text-base sm:text-lg text-white uppercase tracking-tight leading-snug">
                    {c.title}
                  </h3>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wide leading-relaxed text-brutal-yellow">
                    {c.metrics.map((m) => m.value).join(" · ")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer line ────────────────────────────── */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
          <Link
            href="/work"
            className="inline-flex items-center justify-center border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-wide px-6 py-3 text-sm hover:bg-transparent hover:text-brutal-yellow transition-colors duration-150"
          >
            All work, with filters →
          </Link>
          <span className="hidden sm:inline text-white/20">·</span>
          <Link
            href="/insights"
            className="font-mono text-sm font-bold text-brutal-yellow underline underline-offset-4 hover:no-underline transition-all duration-150 whitespace-nowrap"
          >
            Read 24 insights from these projects →
          </Link>
        </div>
      </div>
    </section>
  );
}

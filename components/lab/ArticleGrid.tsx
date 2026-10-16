import Link from "next/link";
import { formatCents, type MoneyModule } from "@/lib/money-lab";

/** Card grid for a lab's article list. First card spans the row; the last one spans two. */
export default function ArticleGrid({ base, modules, counters }: { base: string; modules: MoneyModule[]; counters: Record<string, number> }) {
  return (
    <section className="py-14 md:py-20">
      <ol className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {modules.map((m, i) => {
          const ink = m.ink ?? "#000";
          const dark = Boolean(m.ink);
          return (
            <li key={m.slug} className={`flex ${i === 0 ? "md:col-span-2 lg:col-span-3" : i === modules.length - 1 ? "md:col-span-2" : ""}`}>
              <Link
                href={`${base}/${m.slug}`}
                className="group flex-1 flex flex-col gap-4 border-[3px] border-brutal-black p-5 md:p-6 shadow-[8px_8px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] hover:translate-x-[4px] hover:translate-y-[4px] transition-[transform,box-shadow] duration-150"
                style={{ background: m.color, color: ink }}
              >
                <div className="flex items-center justify-between gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
                  <span>
                    <span className={`inline-block px-1.5 py-0.5 mr-2 ${dark ? "bg-cream text-brutal-black" : "bg-brutal-black text-cream"}`}>{String(i + 1).padStart(2, "0")}</span>
                    {m.kicker}
                  </span>
                  <span className={`inline-flex items-center gap-2 border-[2px] px-2 py-0.5 text-[10px] ${dark ? "border-cream" : "border-brutal-black"}`}>
                    <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-current" />
                    Live
                  </span>
                </div>
                <h2 className={`font-display font-black uppercase tracking-[-0.05em] leading-[0.85] ${i === 0 ? "text-5xl md:text-8xl" : i === modules.length - 1 ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl"}`}>{m.title}</h2>
                <p className={`font-display leading-snug ${dark ? "opacity-85" : "text-brutal-black/80"} ${i === 0 ? "text-lg md:text-xl max-w-2xl" : "text-base"}`}>{m.proves}</p>
                {m.counters.length > 0 && (
                  <dl className={`mt-auto grid gap-x-4 gap-y-2 border-t-[3px] pt-3 ${dark ? "border-cream/60" : "border-brutal-black"}`} style={{ gridTemplateColumns: `repeat(${Math.min(3, m.counters.length)}, minmax(0, 1fr))` }}>
                    {m.counters.map((k) => {
                      const v = counters[k.key] ?? 0;
                      return (
                        <div key={k.key} className="min-w-0">
                          <dd className="font-display font-black text-2xl leading-none tracking-[-0.03em] tabular-nums">{k.format === "cents" ? formatCents(v) : v.toLocaleString("en-US")}</dd>
                          <dt className={`font-mono text-[9px] font-bold uppercase tracking-[0.15em] mt-1 ${dark ? "opacity-70" : "text-brutal-black/60"}`}>{k.label}</dt>
                        </div>
                      );
                    })}
                  </dl>
                )}
                <span className={`font-mono text-[11px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-2 ${m.counters.length ? "" : "mt-auto"}`}>
                  Open
                  <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5" aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

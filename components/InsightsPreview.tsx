import Link from "next/link";
import { insights, categories, featuredInsightIds } from "@/lib/insights-data";

const featuredInsights = featuredInsightIds
  .map((id) => insights.find((insight) => insight.id === id))
  .filter((insight): insight is NonNullable<typeof insight> => !!insight);

// Only the Lab palette, combined across rows (pink is the ground; yellow reads
// badly on pink, so the accents cycle teal / purple / orange).
const ACCENTS = ["#4ECDC4", "#B79CFF", "#FF8A3D"];

function categoryLabel(key: string) {
  return categories.find((c) => c.key === key)?.label ?? key.toUpperCase();
}

export default function InsightsPreview() {
  return (
    <section id="insights" className="bg-[#FF5CAA] border-y-[3px] border-brutal-black py-20 md:py-28 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-black text-cream px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            Insights
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
            I think
            <br />
            out loud.
          </h2>
          <p className="font-display text-base sm:text-lg text-brutal-black/70 max-w-2xl leading-relaxed">
            Selected pieces from things I&apos;ve shipped — what worked, what almost broke, and what I&apos;d do differently.
          </p>
        </div>

        {/* editorial list — no cards */}
        <div className="border-t-[3px] border-brutal-black">
          {featuredInsights.map((insight, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
            <Link
              key={insight.id}
              href={`/insights#insight-${insight.id}`}
              className="group grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-3 items-start border-b-[3px] border-brutal-black py-7 lg:py-8 outline-none transition-[padding] duration-150 lg:hover:pl-4 focus-visible:pl-4"
            >
              {/* big number */}
              <span className="lg:col-span-1 font-mono font-bold text-4xl lg:text-5xl leading-none tracking-[-0.05em] text-brutal-black/70 group-hover:text-brutal-black transition-colors" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* category + title */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brutal-black/70">
                  <span className="h-3 w-3 border-[2px] border-brutal-black" style={{ backgroundColor: accent }} aria-hidden="true" />
                  {categoryLabel(insight.category)}
                </span>
                <h3 className="font-display font-black uppercase tracking-[-0.03em] leading-[0.95] text-brutal-black text-2xl sm:text-3xl lg:text-4xl">
                  <span className="relative inline-block">
                    <span className="absolute left-0 top-0 translate-x-[3px] translate-y-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ color: accent }} aria-hidden="true">
                      {insight.title}
                    </span>
                    <span className="relative">{insight.title}</span>
                  </span>
                </h3>
              </div>

              {/* quote — reserved column; slides in on desktop hover, always shown on mobile */}
              <div className="lg:col-span-4 lg:border-l-[3px] lg:border-brutal-black/40 lg:pl-6 opacity-100 lg:opacity-0 lg:-translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-[opacity,transform] duration-150">
                <p className="font-display text-sm sm:text-base leading-relaxed text-brutal-black/80">
                  &ldquo;{insight.highlight}&rdquo;
                </p>
              </div>
            </Link>
            );
          })}
        </div>

        <Link
          href="/insights"
          className="mt-10 inline-flex items-center justify-center border-[3px] border-brutal-black bg-brutal-black text-cream font-display font-black uppercase tracking-wide px-8 py-4 text-base shadow-[6px_6px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-[transform,box-shadow] duration-150"
        >
          All insights →
        </Link>
      </div>
    </section>
  );
}

import type { Metric } from "@/lib/work-data";
import CountUp from "./CountUp";

type Tone = "light" | "dark";

interface MetricsProps {
  metrics: Metric[];
  tone?: Tone;
  /** row = compact stack for index rows · block = big boxes for the Proof section */
  variant?: "row" | "block";
  animate?: boolean;
}

export default function Metrics({
  metrics,
  tone = "light",
  variant = "row",
  animate = true,
}: MetricsProps) {
  const isDark = tone === "dark";

  if (variant === "block") {
    return (
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`relative border-[3px] p-6 md:p-7 flex flex-col gap-3 ${
              isDark ? "border-cream bg-[#0a0a0a]" : "border-brutal-black bg-white"
            }`}
            style={{ boxShadow: "6px 6px 0px 0px #FFE600" }}
          >
            <dd
              className={`order-1 font-mono font-bold tracking-[-0.04em] leading-none whitespace-nowrap ${
                isDark ? "text-cream" : "text-brutal-black"
              }`}
              style={{ fontSize: "clamp(1.9rem, 3.1vw, 2.75rem)" }}
            >
              {animate ? <CountUp value={m.value} /> : m.value}
            </dd>
            <dt
              className={`order-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${
                isDark ? "text-cream/55" : "text-brutal-black/60"
              }`}
            >
              {m.label}
            </dt>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 sm:gap-4 lg:gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className={`border-l-[3px] pl-3 lg:pl-4 flex items-baseline sm:items-start sm:flex-col gap-x-3 gap-y-1 ${
            isDark ? "border-brutal-yellow" : "border-brutal-black"
          }`}
        >
          <dd
            className={`order-1 font-mono font-bold text-xl lg:text-2xl leading-none tracking-[-0.03em] whitespace-nowrap ${
              isDark ? "text-cream" : "text-brutal-black"
            }`}
          >
            {animate ? <CountUp value={m.value} /> : m.value}
          </dd>
          <dt
            className={`order-2 font-mono text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.15em] leading-snug ${
              isDark ? "text-cream/50" : "text-brutal-black/55"
            }`}
          >
            {m.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

import Link from "next/link";
import type { WorkCase } from "@/lib/work-data";
import NdaStamp from "@/components/ui/NdaStamp";
import Metrics from "./Metrics";

type Tone = "light" | "dark";

const isTodo = (s?: string) => !s || s.startsWith("TODO(");

function Tags({ c, tone }: { c: WorkCase; tone: Tone }) {
  const chip =
    tone === "dark"
      ? "border-cream/30 text-cream/70"
      : "border-brutal-black text-brutal-black";
  const region =
    tone === "dark" ? "text-brutal-yellow" : "text-brutal-black/60";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {c.tags.map((t) => (
        <span
          key={t}
          className={`inline-block border-[2px] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${chip}`}
        >
          {t}
        </span>
      ))}
      <span
        className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${
          c.tags.length ? "ml-1" : ""
        } ${region}`}
      >
        {c.region}
      </span>
    </div>
  );
}

/**
 * One row per case. Full cases link to /work/[slug]; short ones are static.
 * The whole row is the link so the hit area is honest.
 */
export default function CaseRow({
  c,
  tone = "light",
  headingLevel = "h2",
}: {
  c: WorkCase;
  tone?: Tone;
  /** h2 on /work (under the page h1), h3 on the home page section. */
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const dark = tone === "dark";
  const text = dark ? "text-cream" : "text-brutal-black";
  const dim = dark ? "text-cream/60" : "text-brutal-black/70";
  const rule = dark ? "border-cream/20" : "border-brutal-black";

  const inner = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6">
      {/* ── Index + NDA ───────────────────────────── */}
      <div className="lg:col-span-1 flex lg:flex-col items-center lg:items-start justify-between lg:justify-start gap-3">
        <span
          className={`font-mono font-bold text-3xl lg:text-4xl leading-none tracking-[-0.05em] ${
            dark ? "text-cream/50 group-hover:text-brutal-yellow" : "text-brutal-black/55 group-hover:text-brutal-black"
          } transition-colors duration-150`}
          aria-hidden="true"
        >
          {c.index}
        </span>
        {c.nda && <NdaStamp tone={tone} />}
      </div>

      {/* ── Title + problem + tags ────────────────── */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <Heading
          className={`font-display font-black uppercase tracking-[-0.03em] leading-[0.92] ${text} ${
            c.full ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl"
          }`}
        >
          {c.title}
        </Heading>
        <p className={`font-display leading-relaxed max-w-2xl ${dim} ${c.full ? "text-base sm:text-lg" : "text-sm sm:text-base"}`}>
          {c.problem}
        </p>
        {!c.full && c.note && (
          <p className={`font-display text-sm leading-relaxed max-w-2xl ${dark ? "text-cream/60" : "text-brutal-black/65"}`}>
            {c.note}
          </p>
        )}
        <Tags c={c} tone={tone} />
      </div>

      {/* ── Metrics ───────────────────────────────── */}
      <div
        className={`lg:col-span-4 lg:pl-6 lg:border-l-[3px] lg:border-dashed flex flex-col justify-between gap-5 ${
          dark ? "lg:border-cream/20" : "lg:border-brutal-black/20"
        }`}
      >
        <Metrics metrics={c.metrics} tone={tone} animate={c.full} />
        {c.full ? (
          <span
            className={`font-mono text-xs font-bold uppercase tracking-[0.2em] inline-flex items-center gap-2 ${
              dark ? "text-brutal-yellow" : "text-brutal-black"
            }`}
          >
            Read the case
            <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5" aria-hidden="true">
              →
            </span>
          </span>
        ) : (
          <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${dark ? "text-cream/55" : "text-brutal-black/60"}`}>
            {isTodo(c.period) ? "No write-up" : `${c.period} · no write-up`}
          </span>
        )}
      </div>
    </div>
  );

  const base = `group relative block border-b-[3px] ${rule} py-10 lg:py-12 pl-0 transition-[padding,background-color] duration-150`;

  if (!c.full) {
    return <article className={base}>{inner}</article>;
  }

  return (
    <article className="relative">
      {/* Yellow bar slides in on hover */}
      <Link
        href={`/work/${c.slug}`}
        className={`${base} hover:pl-5 lg:hover:pl-6 focus-visible:pl-5 outline-none ${
          dark ? "hover:bg-white/[0.03]" : "hover:bg-white/60"
        }`}
        aria-label={`${c.title}: read the case`}
      >
        <span
          className="absolute left-0 top-0 bottom-[-3px] w-0 bg-brutal-yellow transition-[width] duration-150 group-hover:w-2.5 group-focus-visible:w-2.5"
          aria-hidden="true"
        />
        {inner}
      </Link>
    </article>
  );
}

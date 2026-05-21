"use client";

import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { Info, Link2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import {
  insights,
  categories,
  explainers,
  lessons as lessonsData,
  type Insight,
  type InsightCategory,
  type ExplainerCard,
  type Lesson,
} from "@/lib/insights-data";
import { siteConfig } from "@/lib/data";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Include trailing punctuation inside the <mark> so it doesn't orphan on a new line */
function highlightText(text: string, phrase: string): React.ReactNode {
  if (!phrase) return text;
  const idx = text.indexOf(phrase);
  if (idx === -1) return text;
  const afterPhrase = text.slice(idx + phrase.length);
  const trailingMatch = afterPhrase.match(/^[.,!?;:'")\]—]+/);
  const trailing = trailingMatch ? trailingMatch[0] : "";
  const endIdx = idx + phrase.length + trailing.length;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{phrase}{trailing}</mark>
      {text.slice(endIdx)}
    </>
  );
}

function catColor(key: string): string {
  return categories.find((c) => c.key === key)?.color ?? "#000";
}
function catLabel(key: string): string {
  return categories.find((c) => c.key === key)?.label ?? key.toUpperCase();
}

function calcReadingTime(list: Insight[]): number {
  const words = list
    .filter((i) => !i.redacted)
    .reduce((sum, i) => sum + [i.situation, i.decision, i.outcome].join(" ").split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.ceil(words / 200));
}

const TOTAL = 24; // 23 regular + 1 redacted

const takeaways = [
  {
    number: "01",
    text: "Your users don't care about your architecture. They care about whether the product solves their problem. Build for that.",
    refs: [3, 15],
  },
  {
    number: "02",
    text: "Tech debt you choose deliberately is manageable. Tech debt you accumulate by accident is a liability. Know the difference.",
    refs: [18],
  },
  {
    number: "03",
    text: "If your staging environment is a toy, your production will be a disaster. Infrastructure decisions are product decisions.",
    refs: [7],
  },
];

// ── Scroll helpers ────────────────────────────────────────────────────────────

function scrollToCard(id: number) {
  const el = document.getElementById(`insight-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("highlight-flash");
  void el.offsetWidth; // reflow to restart animation
  el.classList.add("highlight-flash");
  setTimeout(() => el.classList.remove("highlight-flash"), 2100);
}

// ── Explainer card ────────────────────────────────────────────────────────────

function ExplainerCardEl({ explainer }: { explainer: ExplainerCard }) {
  return (
    <div className="break-inside-avoid mb-6 bg-brutal-yellow border-[2px] border-brutal-black p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Info size={14} strokeWidth={2.5} className="text-brutal-black/60 flex-shrink-0" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brutal-black/60 font-bold">
          In Plain English
        </span>
      </div>
      <p className="font-display font-bold text-base text-brutal-black">{explainer.term}</p>
      <p className="font-display text-sm text-brutal-black/70 leading-relaxed">{explainer.explanation}</p>
    </div>
  );
}

// ── Redacted card ─────────────────────────────────────────────────────────────

function RedactedCard({ insight }: { insight: Insight }) {
  return (
    <div
      id={`insight-${insight.id}`}
      className="relative bg-brutal-black border-[3px] border-brutal-red break-inside-avoid mb-6 -rotate-[0.5deg] overflow-hidden flex flex-col"
      style={{ boxShadow: "6px 6px 0px 0px #FF0000" }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        <span
          className="font-mono font-black text-brutal-red/10 uppercase whitespace-nowrap"
          style={{ fontSize: "4.5rem", letterSpacing: "0.5em", transform: "rotate(-30deg)" }}
        >
          CLASSIFIED
        </span>
      </div>
      <div className="h-[6px] bg-brutal-red flex-shrink-0" />
      <div className="p-5 flex flex-col gap-4 relative">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 bg-brutal-red text-cream">
            HARD LESSONS
          </span>
          <span className="font-mono text-sm text-white/20">#{String(insight.id).padStart(2, "0")}</span>
        </div>
        <div>
          <p className="font-mono text-[10px] text-white/20 uppercase tracking-[0.2em] mb-2">
            Situation · Decision · Outcome
          </p>
          <div className="flex flex-col gap-2.5" style={{ filter: "blur(3px)" }}>
            {[95, 70, 100, 55, 85, 65, 90, 40].map((w, i) => (
              <div key={i} className="h-2 bg-white/25 rounded-sm" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" style={{ filter: "blur(2px)" }}>
          {["[REDACTED]", "[REDACTED]", "[REDACTED]"].map((t, i) => (
            <span key={i} className="font-mono text-[10px] border border-brutal-red/40 text-brutal-red/60 px-2 py-0.5">{t}</span>
          ))}
        </div>
      </div>
      <div className="relative border-t-[3px] border-brutal-red/50 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Note from the author
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <p className="font-display text-sm text-white/90 leading-relaxed">
          This one is actually good. Like, <em>genuinely</em> good — the kind of lesson that makes a room
          go quiet for a second. The client nodded slowly. Someone took notes. Those notes are now in a legal document.
        </p>
        <p className="font-display text-sm text-white/60 leading-relaxed">
          What happened involved{" "}
          <span className="font-mono text-xs bg-brutal-red/20 text-brutal-red border border-brutal-red/30 px-1.5 py-0.5">
            [REDACTED]
          </span>
          , a very honest post-mortem, and apparently one too many people on the CC list.
          The outcome was useful. The details are 0% shareable.
        </p>
        <p className="font-display text-sm font-bold text-white">
          Sorry. You get 23 insights instead of 24. The 24th one knew too much.
        </p>
      </div>
      <div className="h-[4px] bg-brutal-red/50 flex-shrink-0" />
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  onCopyLink,
}: {
  insight: Insight;
  onCopyLink: (id: number) => void;
}) {
  const color = catColor(insight.category);
  const secColor = insight.secondaryCategory ? catColor(insight.secondaryCategory) : null;
  const isLesson = insight.category === "lessons";

  return (
    <div
      id={`insight-${insight.id}`}
      className={`bg-white border-[3px] border-brutal-black break-inside-avoid mb-6 flex flex-col transition-transform duration-150 ${
        isLesson ? "border-dashed -rotate-[0.4deg]" : ""
      }`}
      style={{ boxShadow: "6px 6px 0px 0px #000000" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `4px 4px 0px 0px ${color}`;
        (e.currentTarget as HTMLDivElement).style.transform = "translate(2px, 2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "6px 6px 0px 0px #000000";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      }}
    >
      {/* Accent strip */}
      <div className="h-[4px] flex-shrink-0 border-b-[2px] border-brutal-black" style={{ backgroundColor: color }} />

      {/* Top row */}
      <div className="flex items-start justify-between px-5 pt-4 pb-0 gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <span
            className="font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-brutal-black/20"
            style={{ backgroundColor: color, color: color === "#FF0000" || color === "#000000" ? "#fff" : "#000" }}
          >
            {catLabel(insight.category)}
          </span>
          {secColor && (
            <span
              className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-brutal-black/15"
              style={{ backgroundColor: secColor + "30", color: "#000" }}
            >
              {catLabel(insight.secondaryCategory!)}
            </span>
          )}
        </div>
        {/* Anchor link — click to copy */}
        <button
          onClick={() => onCopyLink(insight.id)}
          title="Copy link to this insight"
          className="group flex items-center gap-1 font-mono text-sm text-brutal-black/20 hover:text-brutal-black/60 transition-colors duration-150 cursor-pointer flex-shrink-0"
        >
          <Link2 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          #{String(insight.id).padStart(2, "0")}
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        <h3 className="font-display font-bold text-lg text-brutal-black leading-snug">{insight.title}</h3>

        <div>
          <p className="font-mono text-[10px] text-brutal-black/30 uppercase tracking-[0.2em] mb-1.5">Situation</p>
          <div className="border-t border-brutal-black/10 pt-2">
            <p className="font-display text-sm text-brutal-black/50 leading-relaxed">{insight.situation}</p>
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] text-brutal-black/30 uppercase tracking-[0.2em] mb-1.5">Decision</p>
          <div className="border-t border-brutal-black/10 pt-2">
            <p className="font-display text-sm font-medium text-brutal-black/85 leading-relaxed">{insight.decision}</p>
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] text-brutal-black/30 uppercase tracking-[0.2em] mb-1.5">Outcome</p>
          <div className="border-t border-brutal-black/10 pt-2">
            <p className="font-display text-sm text-brutal-black/80 leading-relaxed">
              {highlightText(insight.outcome, insight.highlight)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 mt-auto">
          {insight.tags.map((tag) => (
            <span key={tag} className="font-mono text-[10px] border border-brutal-black/15 text-brutal-black/35 px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>

        {insight.seeAlso && insight.seeAlso.length > 0 && (
          <div className="mt-1 pt-3 border-t border-brutal-black/10 flex flex-col gap-1.5">
            {insight.seeAlso.map((ref) => (
              <button
                key={ref.id}
                onClick={() => scrollToCard(ref.id)}
                className="font-mono text-[11px] text-brutal-black/30 hover:text-brutal-black/70 text-left transition-colors duration-150 cursor-pointer"
              >
                → #{String(ref.id).padStart(2, "0")} — {ref.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [active, setActive] = useState<"all" | InsightCategory>("all");
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const focusedIndexRef = useRef(-1);

  // Visible insights sorted by id (for keyboard nav)
  const visibleInsights = useMemo(() => {
    return insights
      .filter((i) => active === "all" || i.category === active)
      .sort((a, b) => a.id - b.id);
  }, [active]);

  const visibleIdsRef = useRef(visibleInsights.map((i) => i.id));
  const isFirstRender = useRef(true);
  useEffect(() => {
    visibleIdsRef.current = visibleInsights.map((i) => i.id);
    focusedIndexRef.current = -1;
    // Scroll to top when filter changes (skip initial mount)
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [visibleInsights]);

  // Visible non-redacted for counts/reading time
  const visibleNonRedacted = visibleInsights.filter((i) => !i.redacted);
  const readingTime = calcReadingTime(visibleNonRedacted);
  const visibleCount = visibleInsights.length;

  // Scroll + progress
  useEffect(() => {
    const handler = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min((scrolled / total) * 100, 100) : 0);
      setShowBackToTop(scrolled > 800);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Hash navigation on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#insight-")) {
      const id = parseInt(hash.replace("#insight-", ""));
      if (!isNaN(id)) {
        setTimeout(() => scrollToCard(id), 600);
      }
    }
  }, []);

  // Keyboard shortcuts
  const catKeys: InsightCategory[] = ["architecture", "team", "payments", "product", "devops", "lessons", "stakeholders"];

  const scrollToNext = useCallback(() => {
    const ids = visibleIdsRef.current;
    if (!ids.length) return;
    focusedIndexRef.current = Math.min(focusedIndexRef.current + 1, ids.length - 1);
    scrollToCard(ids[focusedIndexRef.current]);
  }, []);

  const scrollToPrev = useCallback(() => {
    const ids = visibleIdsRef.current;
    if (!ids.length) return;
    if (focusedIndexRef.current < 0) focusedIndexRef.current = 0;
    focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0);
    scrollToCard(ids[focusedIndexRef.current]);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "j": scrollToNext(); break;
        case "k": scrollToPrev(); break;
        case "t": case "T": window.scrollTo({ top: 0, behavior: "smooth" }); break;
        case "0": setActive("all"); break;
        case "1": setActive(catKeys[0]); break;
        case "2": setActive(catKeys[1]); break;
        case "3": setActive(catKeys[2]); break;
        case "4": setActive(catKeys[3]); break;
        case "5": setActive(catKeys[4]); break;
        case "6": setActive(catKeys[5]); break;
        case "7": setActive(catKeys[6]); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scrollToNext, scrollToPrev]);

  function copyCardLink(id: number) {
    const url = `${window.location.origin}${window.location.pathname}#insight-${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    window.history.replaceState(null, "", `#insight-${id}`);
    setToast("Link copied!");
    setTimeout(() => setToast(null), 2000);
  }

  const openCalendly = () => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
    }
  };

  return (
    <>
      <Navigation />

      {/* ── Black hero ────────────────────────────────────── */}
      <section className="bg-brutal-black border-b-[3px] border-brutal-black pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white/40 hover:text-brutal-yellow transition-colors duration-150 mb-8">
            ← tfpdev.com
          </Link>
          <div className="mb-6">
            <span className="inline-block border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
              Insights
            </span>
          </div>
          <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl leading-[0.9] tracking-[-0.04em] text-cream uppercase mb-6">
            Things I learned
            <br />building real
            <br /><span className="text-brutal-yellow">products.</span>
          </h1>
          <p className="font-display text-base sm:text-lg text-white/55 max-w-2xl leading-relaxed mb-4">
            24 decisions from a real platform build. Organized into 3 lessons that took 8 years to learn.{" "}
            <span className="text-brutal-red font-semibold">One is classified.</span>
          </p>
          <p className="font-mono text-xs text-white/30 max-w-2xl leading-relaxed">
            Numbers are approximate where stated and exact where marked. I&apos;d rather say &ldquo;I don&apos;t have that number&rdquo; than make one up. If you want specifics on any of these, ask me on a call — I&apos;ll tell you what I know and what I don&apos;t.
          </p>
        </div>
      </section>

      {/* ── Sticky filter bar ─────────────────────────────── */}
      <div className="sticky top-16 z-40 bg-cream border-b-[3px] border-brutal-black">
        {/* Progress bar */}
        <div className="h-1 bg-brutal-black/10 w-full">
          <div className="h-full bg-brutal-yellow transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => {
              const isActive = active === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActive(cat.key)}
                  className={`flex-shrink-0 font-mono text-xs uppercase tracking-wider px-4 py-2 border-2 transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "border-brutal-black shadow-brutal-sm translate-x-[1px] translate-y-[1px]"
                      : "border-brutal-black/20 text-brutal-black/40 hover:border-brutal-black/40 hover:text-brutal-black/60"
                  }`}
                  style={isActive ? { backgroundColor: cat.color, color: cat.color === "#FF0000" || cat.color === "#000000" ? "#fff" : "#000" } : {}}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Counter + reading time + shortcuts */}
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-[11px] text-brutal-black/40">
              {visibleCount === TOTAL ? `All ${TOTAL} entries` : `Showing ${visibleCount} of ${TOTAL}`}
              {" · "}~{readingTime} min read
            </span>
            <div className="relative">
              <button
                onClick={() => setShowShortcuts((s) => !s)}
                className="font-mono text-[10px] text-brutal-black/25 hover:text-brutal-black/50 transition-colors cursor-pointer"
              >
                ⌨ shortcuts
              </button>
              {showShortcuts && (
                <div className="absolute bottom-full right-0 mb-2 bg-brutal-black text-cream p-4 font-mono text-xs border-[3px] border-brutal-black shadow-brutal z-50 whitespace-nowrap flex flex-col gap-1.5">
                  <p className="font-bold text-brutal-yellow mb-1 uppercase tracking-widest">Keyboard shortcuts</p>
                  <p><span className="text-brutal-yellow">J / K</span> — next / prev insight</p>
                  <p><span className="text-brutal-yellow">0</span> — show all</p>
                  <p><span className="text-brutal-yellow">1–7</span> — category filters</p>
                  <p><span className="text-brutal-yellow">T</span> — scroll to top</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card grid — lesson view (ALL) or flat category view ─── */}
      {active === "all" ? (
        // ── LESSON VIEW ─────────────────────────────────────────
        <>
          {lessonsData.map((lesson) => {
            const lessonInsights = insights
              .filter((i) => i.lesson === lesson.key && !i.redacted)
              .sort((a, b) => a.id - b.id);
            const redactedCard = lesson.key === "pragmatism"
              ? insights.find((i) => i.redacted)
              : undefined;
            const lessonReadTime = calcReadingTime(lessonInsights);

            return (
              <Fragment key={lesson.key}>
                {/* Black lesson divider */}
                <div className="bg-brutal-black border-b-[3px] border-brutal-black py-14 md:py-20 relative overflow-hidden">
                  {/* Big number watermark */}
                  <span
                    className="absolute top-0 right-6 font-display font-black text-brutal-yellow leading-none select-none pointer-events-none"
                    style={{ fontSize: "clamp(7rem,16vw,13rem)", opacity: 0.12 }}
                    aria-hidden="true"
                  >
                    {lesson.number}
                  </span>
                  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4">
                      Lesson {lesson.number}
                    </p>
                    <h2
                      className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white uppercase leading-[0.95] tracking-[-0.03em] mb-4"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {lesson.title}
                    </h2>
                    <p className="font-display text-base sm:text-lg text-white/55 mb-6 max-w-xl">
                      {lesson.subtitle}
                    </p>
                    <p className="font-mono text-xs text-white/25">
                      {lessonInsights.length} insight{lessonInsights.length !== 1 ? "s" : ""}
                      {" · "}~{lessonReadTime} min read
                    </p>
                  </div>
                </div>

                {/* Cream cards for this lesson */}
                <section className="bg-cream border-b-[3px] border-brutal-black py-10">
                  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="columns-1 md:columns-2 gap-6">
                      {lessonInsights.map((insight) => (
                        <Fragment key={insight.id}>
                          <InsightCard insight={insight} onCopyLink={copyCardLink} />
                          {explainers
                            .filter((ex) => ex.appearsAfter === insight.id)
                            .map((ex) => <ExplainerCardEl key={ex.id} explainer={ex} />)}
                        </Fragment>
                      ))}
                      {/* Redacted at end of lesson 2 */}
                      {redactedCard && <RedactedCard insight={redactedCard} />}
                    </div>
                  </div>
                </section>
              </Fragment>
            );
          })}
        </>
      ) : (
        // ── CATEGORY FLAT VIEW ───────────────────────────────────
        <section className="bg-cream py-10 border-b-[3px] border-brutal-black">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Explainer legend */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="flex items-center gap-2 bg-brutal-yellow border-[2px] border-brutal-black px-3 py-1.5">
                <Info size={12} strokeWidth={2.5} />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">In Plain English</span>
              </div>
              <span className="font-mono text-xs text-brutal-black/40">
                — yellow cards translate technical jargon for non-technical readers
              </span>
            </div>

            <div className="columns-1 md:columns-2 gap-6">
              {visibleInsights.map((insight) => (
                <Fragment key={insight.id}>
                  {insight.redacted ? (
                    <RedactedCard insight={insight} />
                  ) : (
                    <InsightCard insight={insight} onCopyLink={copyCardLink} />
                  )}
                  {explainers
                    .filter((ex) => ex.appearsAfter === insight.id)
                    .map((ex) => <ExplainerCardEl key={ex.id} explainer={ex} />)}
                </Fragment>
              ))}
            </div>

            {visibleInsights.length === 0 && (
              <p className="font-mono text-sm text-brutal-black/40 text-center py-20">
                No insights in this category.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Top 3 Takeaways ───────────────────────────────── */}
      <section className="bg-brutal-black border-b-[3px] border-brutal-black py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-10">
            If you read nothing else
          </p>

          <div className="flex flex-col gap-12">
            {takeaways.map((t) => (
              <div key={t.number} className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                <span className="font-display font-black text-5xl sm:text-6xl text-brutal-yellow leading-none flex-shrink-0">
                  {t.number}
                </span>
                <div className="flex flex-col gap-3">
                  <p className="font-display text-lg sm:text-xl text-cream leading-relaxed">{t.text}</p>
                  <div className="flex gap-3">
                    {t.refs.map((id) => (
                      <button
                        key={id}
                        onClick={() => scrollToCard(id)}
                        className="font-mono text-xs text-white/30 hover:text-brutal-yellow transition-colors duration-150 cursor-pointer"
                      >
                        → #{String(id).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ────────────────────────────────────── */}
      <footer className="bg-brutal-black py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 items-start">
          <span className="inline-block border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
            Ready?
          </span>
          <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl uppercase tracking-[-0.03em] text-cream leading-[0.95] max-w-2xl">
            These aren&apos;t blog posts.
            <br /><span className="text-brutal-yellow">They&apos;re real decisions</span>
            <br />from real projects.
          </h2>
          <p className="font-display text-lg text-white/55 max-w-lg leading-relaxed">
            Want to see how I&apos;d approach yours?
          </p>
          <button
            onClick={openCalendly}
            className="btn-pulse inline-flex items-center justify-center border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-wide px-8 py-4 text-lg hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all duration-150 cursor-pointer"
          >
            Book a Call →
          </button>
          <Link href="/" className="font-mono text-sm font-bold uppercase tracking-widest text-white/30 hover:text-brutal-yellow transition-colors duration-150">
            ← Back to tfpdev.com
          </Link>
          <a
            href={siteConfig.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm font-bold uppercase tracking-widest text-white/30 hover:text-brutal-yellow transition-colors duration-150"
          >
            LinkedIn →
          </a>
        </div>
      </footer>

      {/* ── Floating back-to-top ──────────────────────────── */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 bg-brutal-yellow border-[3px] border-brutal-black font-mono text-xs font-black uppercase px-4 py-3 shadow-brutal hover:shadow-brutal-hover hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all duration-150 cursor-pointer"
        >
          ↑ TOP
        </button>
      )}

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 bg-brutal-black text-cream font-mono text-xs font-bold uppercase tracking-widest px-4 py-3 border-[3px] border-brutal-yellow shadow-brutal">
          {toast}
        </div>
      )}
    </>
  );
}

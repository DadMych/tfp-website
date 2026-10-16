"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { siteConfig } from "@/lib/data";
import { answerScore, areas, decodeAnswers, encodeAnswers, exposure, maxScore, questions, type Answer } from "@/lib/review";

const OPTIONS: { v: Answer; label: string }[] = [
  { v: "yes", label: "Yes" },
  { v: "unsure", label: "Not sure" },
  { v: "no", label: "No" },
];

/**
 * Ten questions, no email gate, result in the URL so it can be sent to a
 * colleague or brought to the call. Nothing is stored anywhere.
 */
export default function RiskCheck() {
  // Answers shared by link arrive in ?r=; edits layer on top. Server renders the empty form.
  const urlCode = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("r"),
    () => null
  );
  const [edits, setEdits] = useState<Record<string, Answer>>({});
  const answers = useMemo(() => ({ ...decodeAnswers(urlCode), ...edits }), [urlCode, edits]);
  const setAnswers = (fn: (s: Record<string, Answer>) => Record<string, Answer>) => setEdits((s) => fn({ ...decodeAnswers(urlCode), ...s }));
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const answered = questions.filter((q) => answers[q.id]).length;
  const complete = answered === questions.length;
  const score = useMemo(() => questions.reduce((s, q) => s + (answers[q.id] ? answerScore[answers[q.id]] * q.weight : 0), 0), [answers]);
  const result = exposure(score);
  const findings = useMemo(
    () =>
      questions
        .filter((q) => answers[q.id] && answers[q.id] !== "yes")
        .map((q) => ({ q, severity: answerScore[answers[q.id]] * q.weight }))
        .sort((a, b) => b.severity - a.severity),
    [answers]
  );

  const shareUrl = () => `${window.location.origin}/review?r=${encodeAnswers(answers)}#result`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the URL is also in the address bar after "see result" */
    }
  };

  const showResult = () => {
    window.history.replaceState(null, "", `/review?r=${encodeAnswers(answers)}#result`);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const levelBg = result.level === "high" ? "bg-brutal-red text-cream" : result.level === "medium" ? "bg-brutal-yellow" : "bg-brutal-green";

  return (
    <div className="flex flex-col gap-10">
      <ol className="flex flex-col border-[3px] border-brutal-black bg-white shadow-brutal divide-y-[3px] divide-brutal-black">
        {questions.map((q, i) => {
          const a = answers[q.id];
          const area = areas.find((x) => x.id === q.area)!;
          return (
            <li key={q.id} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 p-5 sm:p-7">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/55">
                  {String(i + 1).padStart(2, "0")} · {area.title}
                </span>
                <p className="font-display font-bold text-lg sm:text-xl leading-snug max-w-3xl">{q.q}</p>
                {a && a !== "yes" && <p className="font-display text-base leading-relaxed text-brutal-black/75 max-w-3xl mt-1">{q.risk}</p>}
                {a === "yes" && <p className="font-mono text-xs leading-relaxed text-brutal-black/55 max-w-3xl mt-1">Good: {q.yes}</p>}
              </div>
              <div role="radiogroup" aria-label={`Question ${i + 1}`} className="grid grid-cols-3 border-[3px] border-brutal-black divide-x-[3px] divide-brutal-black h-fit lg:w-[19rem]">
                {OPTIONS.map((o) => {
                  const on = a === o.v;
                  const tone = o.v === "yes" ? "bg-brutal-green" : o.v === "no" ? "bg-brutal-red text-cream" : "bg-brutal-yellow";
                  return (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setAnswers((s) => ({ ...s, [q.id]: o.v }))}
                      className={`h-12 font-mono text-xs font-bold uppercase tracking-[0.15em] transition-colors ${on ? tone : "bg-white hover:bg-cream"}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {/* progress + reveal */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brutal-black/60">
          {answered} / {questions.length} answered
        </p>
        <button
          type="button"
          onClick={showResult}
          disabled={answered === 0}
          className="border-[3px] border-brutal-black bg-brutal-yellow px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-brutal-sm hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-40 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
        >
          {complete ? "See what I'd find →" : `See result so far →`}
        </button>
      </div>

      {/* result */}
      <div id="result" ref={resultRef} className="scroll-mt-28">
        {answered > 0 && (
          <div className="border-[3px] border-brutal-black bg-white shadow-brutal">
            <div className={`px-6 sm:px-8 py-7 border-b-[3px] border-brutal-black ${levelBg}`}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-80">{complete ? "Your result" : `Based on ${answered} of ${questions.length}`}</span>
                  <h3 className="font-display font-black uppercase tracking-[-0.03em] leading-none text-4xl sm:text-5xl">{result.label}</h3>
                  <p className="font-display text-base sm:text-lg leading-snug max-w-2xl">{result.plain}</p>
                </div>
                <span className="font-mono font-bold text-sm tabular-nums opacity-80">
                  {score} / {maxScore}
                </span>
              </div>
            </div>

            {findings.length === 0 ? (
              <p className="px-6 sm:px-8 py-7 font-display text-lg leading-relaxed">
                Every answer so far is “yes”. Either the basics are genuinely solid, or the answers are optimistic. A review tells you which.
              </p>
            ) : (
              <ol className="divide-y-[3px] divide-brutal-black">
                {findings.map(({ q, severity }, i) => {
                  const area = areas.find((x) => x.id === q.area)!;
                  return (
                    <li key={q.id} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-8 px-6 sm:px-8 py-6">
                      <div className="flex md:flex-col items-center md:items-start gap-3 md:w-24">
                        <span className="font-display font-black text-3xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] border-[2px] border-brutal-black px-1.5 py-0.5 ${severity >= 4 ? "bg-brutal-red text-cream" : severity >= 2 ? "bg-brutal-yellow" : "bg-white"}`}>
                          {severity >= 4 ? "first" : severity >= 2 ? "soon" : "later"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <h4 className="font-display font-black uppercase text-xl tracking-[-0.02em]">{area.title}</h4>
                        <p className="font-display text-base leading-relaxed text-brutal-black/80">{q.risk}</p>
                        <p className="font-mono text-xs leading-relaxed text-brutal-black/70">
                          <span className="font-bold uppercase tracking-[0.15em]">What I’d check first: </span>
                          {q.look}
                        </p>
                        {area.demo && (
                          <Link href={`/lab/money/${area.demo}`} className="w-fit font-mono text-xs font-bold uppercase tracking-[0.2em] underline decoration-[2px] underline-offset-4 hover:bg-brutal-yellow">
                            See it happen live →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="border-t-[3px] border-brutal-black bg-cream px-6 sm:px-8 py-6 flex flex-wrap items-center gap-4">
              <a
                href={siteConfig.calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-[3px] border-brutal-black bg-brutal-black text-cream px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow hover:text-brutal-black transition-colors"
              >
                Book a 30-min call →
              </a>
              <button type="button" onClick={copy} className="border-[3px] border-brutal-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow transition-colors">
                {copied ? "Copied" : "Copy result link"}
              </button>
              <p className="font-mono text-[11px] leading-relaxed text-brutal-black/55 basis-full sm:basis-auto sm:ml-auto max-w-sm">
                Nothing is stored. The answers live in the link; send it to your engineer or bring it to the call.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

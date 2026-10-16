"use client";

import { useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import type { Seg, Variant } from "@/lib/rag/versions";
import type { VersionRun } from "@/lib/rag/scores";

export interface Sample {
  doc: string;
  archived: boolean;
  views: Record<Variant, { heading: Seg[]; text: Seg[] }>;
}
export interface Probe {
  id: string;
  q: string;
  group: "now" | "then" | "trap";
}

const STEPS: { v: Variant; tech: string; plain: string; what: string; plainWhat: string }[] = [
  { v: "asis", tech: "As written", plain: "As written", what: "Old pages say so in their first line, every chunk carries [ARCHIVED, updated date], and the prompt says to prefer current sources.", plainWhat: "Old files say they're old, every piece is labelled with its date, and the AI is told to prefer current files." },
  { v: "nobanner", tech: "No warnings", plain: "No warnings", what: "Every sentence that says a page is archived, superseded or no longer in force is cut from what the model reads.", plainWhat: "Every sentence saying a file is out of date is deleted. Most company drives look like this." },
  { v: "nobanner-nolabel", tech: "No labels", plain: "No labels", what: "Also gone: the [ARCHIVED, updated …] label and the word “archived” in titles. The year in a title stays.", plainWhat: "The “out of date” label is gone too. Only the year in a file's name is left." },
  { v: "nobanner-nolabel-norule", tech: "No rule", plain: "No rule", what: "Also gone: the prompt line “If a source is marked ARCHIVED, prefer current sources”.", plainWhat: "The AI isn't told to prefer current files any more." },
  { v: "nobanner-current", tech: "Archive filtered", plain: "Hide old files", what: "The common fix: archived files never reach the model. Warnings are cut, labels stay.", plainWhat: "The usual advice: hide old files from the AI entirely." },
  { v: "nodates", tech: "No dates", plain: "No dates", what: "No warnings, labels or rule, and every year and date erased. Only the 11 questions about today are asked.", plainWhat: "Everything above, and every date erased. Only questions about today are asked." },
];

const BUILDS = [
  { key: "fixed/keyword/norerank/all", tech: "First build", plain: "Quick version" },
  { key: "section/hybrid/rerank/all", tech: "Careful build", plain: "Careful version" },
] as const;

const GROUPS: { g: Probe["group"]; tech: string; plain: string }[] = [
  { g: "now", tech: "What's true now", plain: "Today's rules" },
  { g: "then", tech: "What was true then", plain: "Last year's rules" },
  { g: "trap", tech: "Traps", plain: "Trick questions" },
];

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

function Segs({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map(([t, cut], i) =>
        cut ? (
          <del key={i} className="bg-[#FFD1E6] text-brutal-black/50 decoration-[#D4006A] decoration-2">
            {t}
          </del>
        ) : (
          <span key={i}>{t}</span>
        )
      )}
    </>
  );
}

export default function VersionsLab({ runs, probes, samples, titles }: { runs: VersionRun[]; probes: Probe[]; samples: Sample[]; titles: Record<string, { title: string; archived: boolean }> }) {
  const { plain } = useExplain();
  const [v, setV] = useState<Variant>("nobanner-nolabel-norule");
  const [id, setId] = useState("v1");

  const run = (build: string, variant: Variant, qid: string) => runs.find((r) => r.build === build && r.variant === variant && r.id === qid);
  const score = (build: string, variant: Variant) => {
    const rs = runs.filter((r) => r.build === build && r.variant === variant);
    return rs.length ? `${rs.filter((r) => r.correct).length}/${rs.length}` : "–";
  };
  const step = STEPS.find((s) => s.v === v)!;
  const asked = run(BUILDS[1].key, v, id) != null;
  const probe = probes.find((p) => p.id === id)!;

  return (
    <div className="flex flex-col gap-5">
      {/* The ladder */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 border-[3px] border-brutal-black bg-brutal-black gap-[3px] shadow-[8px_8px_0_0_#000]">
        {STEPS.map((s, i) => {
          const on = s.v === v;
          return (
            <button key={s.v} type="button" onClick={() => setV(s.v)} aria-pressed={on} className={`text-left px-3 py-3 flex flex-col gap-2 transition-colors ${on ? "bg-brutal-yellow" : "bg-white hover:bg-cream"}`}>
              <span className="flex items-center gap-2">
                <span className={`shrink-0 w-6 h-6 flex items-center justify-center border-2 border-brutal-black font-mono text-[11px] font-bold ${on ? "bg-brutal-black text-brutal-yellow" : "bg-cream"}`}>{i + 1}</span>
                <span className="font-display font-black uppercase tracking-[-0.02em] text-[15px] leading-none">{plain ? s.plain : s.tech}</span>
              </span>
              <span className="grid grid-cols-2 gap-1 font-mono text-[10px] tabular-nums">
                {BUILDS.map((b) => (
                  <span key={b.key} className="flex flex-col">
                    <span className="opacity-50 uppercase tracking-[0.1em]">{(plain ? b.plain : b.tech).split(" ")[0]}</span>
                    <span className="font-bold text-sm">{score(b.key, s.v)}</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className="font-display text-base leading-snug min-h-[5lh] sm:min-h-[3lh] lg:min-h-[2lh] max-w-4xl">
        <span className={`${label} mr-2 px-1.5 py-0.5 bg-brutal-black text-cream`}>{plain ? "Taken away" : "Removed"}</span>
        {plain ? step.plainWhat : step.what}
      </p>

      {/* Questions and answers */}
      <div className="grid grid-cols-1 lg:grid-cols-[19rem_minmax(0,1fr)] border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] lg:h-[34rem]">
        <div className="flex flex-col min-h-0 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black">
          <div className="px-4 h-11 shrink-0 flex items-center justify-between border-b-[3px] border-brutal-black bg-cream">
            <span className={label}>
              <T tech="24 questions" plain="Pick a question" />
            </span>
            <span className="flex gap-3 font-mono text-[9px] uppercase tracking-[0.1em] opacity-60">
              <span>{plain ? "Quick" : "First"}</span>
              <span>{plain ? "Careful" : "Careful"}</span>
            </span>
          </div>
          <div className="h-[18rem] lg:h-auto lg:flex-1 overflow-y-auto">
            {GROUPS.map((g) => (
              <div key={g.g}>
                <div className={`${label} px-4 pt-3 pb-1.5 opacity-50`}>{plain ? g.plain : g.tech}</div>
                <ul>
                  {probes
                    .filter((p) => p.group === g.g)
                    .map((p) => {
                      const on = p.id === id;
                      return (
                        <li key={p.id}>
                          <button type="button" onClick={() => setId(p.id)} aria-pressed={on} className={`w-full text-left px-4 py-2 flex items-start gap-3 border-l-[5px] transition-colors ${on ? "border-brutal-black bg-brutal-yellow" : "border-transparent hover:bg-cream"}`}>
                            <span className="flex-1 min-w-0 font-display text-[13px] leading-snug line-clamp-2">{p.q}</span>
                            <span className="shrink-0 flex gap-[1.15rem] pt-1 pr-2">
                              {BUILDS.map((b) => {
                                const r = run(b.key, v, p.id);
                                return <span key={b.key} title={r ? r.reason : plain ? "Not asked" : "Not asked in this step"} className={`w-3 h-3 border-2 border-brutal-black ${!r ? "bg-transparent border-dashed opacity-30" : r.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]"}`} />;
                              })}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col min-h-0 @container">
          <div className="px-4 py-3 shrink-0 border-b-[3px] border-brutal-black bg-cream font-display font-bold text-base leading-snug h-[5.5rem] lg:h-auto lg:min-h-[4.25rem] flex items-center"><span className="line-clamp-3">{probe.q}</span></div>
          {asked ? (
            <div className="grid grid-cols-1 @2xl:grid-cols-2 lg:flex-1 min-h-0">
              {BUILDS.map((b, i) => {
                const r = run(b.key, v, id)!;
                return (
                  <div key={b.key} className={`flex flex-col min-h-0 h-[20rem] lg:h-auto ${i ? "border-t-[3px] @2xl:border-t-0 @2xl:border-l-[3px] border-brutal-black" : ""}`}>
                    <div className="px-4 h-10 shrink-0 flex items-center justify-between gap-2 border-b-2 border-brutal-black/15">
                      <span className={label}>{plain ? b.plain : b.tech}</span>
                      <span className={`${label} !tracking-[0.1em] px-1.5 py-0.5 border-2 border-brutal-black ${r.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]"}`}>{r.correct ? (plain ? "Right" : "Correct") : plain ? "Wrong" : "Wrong"}</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                      <p className="font-display text-[15px] leading-relaxed whitespace-pre-line">{r.answer}</p>
                      {!r.correct && <p className="font-mono text-[11px] text-[#D4006A] font-bold">{r.reason}</p>}
                    </div>
                    <div className="shrink-0 px-4 py-2.5 border-t-2 border-brutal-black/15 flex flex-col gap-1.5">
                      <span className={`${label} opacity-50`}>
                        <T tech="Files it was given" plain="Files it read" />
                      </span>
                      <span className="flex flex-wrap gap-1 h-[3.25rem] overflow-hidden content-start">
                        {[...new Set(r.retrieved)].map((d) => (
                          <span key={d} className={`max-w-[14rem] truncate px-1.5 py-0.5 border-2 border-brutal-black font-mono text-[10px] ${titles[d]?.archived ? "bg-[#FFD1E6]" : "bg-white"}`}>
                            {titles[d]?.title ?? d}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lg:flex-1 h-[40rem] @2xl:h-[20rem] lg:h-auto flex items-center justify-center p-8 bg-[repeating-linear-gradient(45deg,transparent_0_10px,rgba(0,0,0,0.04)_10px_20px)]">
              <p className="font-display text-base leading-snug max-w-sm text-center">
                <T tech="Not asked in this step. With every date erased, a question about 2024 or 2025 has no answer to find." plain="Not asked here. Once the dates are gone, a question about last year can't be answered at all." />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* What the model reads */}
      <div className="flex flex-col gap-3">
        <span className={`${label} opacity-60`}>
          <T tech="What the careful build reads at this step · real chunks from its index" plain="What the careful version gets to read at this step" />
        </span>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {samples.map((s) => {
            const view = s.views[v];
            const gone = v === "nobanner-current" && s.archived;
            return (
              <div key={s.doc} className="relative flex flex-col border-[3px] border-brutal-black bg-white h-[17rem] min-w-0">
                <div className="px-3 py-2 bg-brutal-black text-cream font-mono text-[10.5px] leading-snug min-h-[3.25rem]">
                  <Segs segs={view.heading} />
                </div>
                <p className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words">
                  <Segs segs={view.text} />
                </p>
                {gone && (
                  <div className="absolute inset-0 top-[3.25rem] flex items-center justify-center bg-cream/90 p-6">
                    <span className="font-display font-black uppercase text-center text-lg leading-tight -rotate-2 border-[3px] border-brutal-black bg-[#FF5CAA] px-3 py-2">
                      <T tech="Filtered out. Never reaches the model." plain="Hidden. The AI never sees it." />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

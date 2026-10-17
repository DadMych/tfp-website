"use client";

import { useMemo, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { EVALSET, type EvalKind } from "@/lib/rag/evalset";
import { QUESTION_KINDS } from "@/lib/rag/kinds";
import type { GradedAnswer } from "@/lib/rag/scores";
import { configLabel } from "./Scoreboard";
import { wrongPlain } from "./rag-client";


const quote = (s: string) => `\u201c${s}\u201d`;
const group = (f: string | string[]) => (Array.isArray(f) ? f.map(quote).join(" or ") : quote(f));
const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

/** `only` shows one kind of question without the tabs; `initial` picks the cell shown first. */
export default function EvalGrid({ configs, answers, only, initial }: { configs: string[]; answers: GradedAnswer[]; only?: EvalKind; initial?: { id: string; config: string } }) {
  const { plain } = useExplain();
  const [kind, setKind] = useState<EvalKind | "all">(only ?? "all");
  const [sel, setSel] = useState<{ id: string; config: string }>(initial ?? { id: "b7", config: configs[0] });
  const by = useMemo(() => new Map(answers.map((a) => [`${a.id}|${a.config}`, a])), [answers]);
  const rows = EVALSET.filter((q) => kind === "all" || q.kind === kind);
  const kinds = Object.keys(QUESTION_KINDS) as EvalKind[];
  const q = EVALSET.find((x) => x.id === sel.id)!;
  const a = by.get(`${sel.id}|${sel.config}`);
  const right = (c: string) => rows.filter((r) => by.get(`${r.id}|${c}`)?.correct).length;
  const tab = (on: boolean) => `shrink-0 h-8 px-2.5 border-2 border-brutal-black ${label} !tracking-[0.08em] transition-colors ${on ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`;

  return (
    <div className="flex flex-col gap-4">
      {!only && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
          <button type="button" role="tab" aria-selected={kind === "all"} className={tab(kind === "all")} onClick={() => setKind("all")}>
            All {EVALSET.length}
          </button>
          {kinds.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} className={tab(kind === k)} onClick={() => setKind(k)}>
              {QUESTION_KINDS[k][plain ? 1 : 0]} {EVALSET.filter((x) => x.kind === k).length}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-4">
        {/* The grid */}
        <div className={`border-[3px] border-brutal-black bg-white shadow-[6px_6px_0_0_#000] flex flex-col ${only ? "h-[26rem]" : "h-[32rem]"} min-w-0`}>
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(6,1.75rem)] sm:grid-cols-[minmax(0,1fr)_repeat(6,2.25rem)] gap-x-1 items-end px-3 py-2 border-b-[3px] border-brutal-black bg-cream">
            <span className={`${label} opacity-60`}>
              <T tech="Question · builds 1–6" plain="Question · versions 1–6" />
            </span>
            {configs.map((c, i) => (
              <span key={c} className="flex flex-col items-center gap-0.5" title={configLabel(c, plain)}>
                <span className="font-mono text-[11px] font-bold">{i + 1}</span>
                <span className="font-mono text-[9px] tabular-nums opacity-60">
                  {right(c)}/{rows.length}
                </span>
              </span>
            ))}
          </div>
          <ol className="flex-1 min-h-0 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id} className={`grid grid-cols-[minmax(0,1fr)_repeat(6,1.75rem)] sm:grid-cols-[minmax(0,1fr)_repeat(6,2.25rem)] gap-x-1 items-center px-3 py-1 border-b border-brutal-black/10 ${sel.id === r.id ? "bg-brutal-yellow/60" : ""}`}>
                <button type="button" onClick={() => setSel((s) => ({ ...s, id: r.id }))} className="text-left truncate font-display text-[13px] leading-snug py-1 hover:underline underline-offset-2" title={r.q}>
                  {r.q}
                </button>
                {configs.map((c) => {
                  const g = by.get(`${r.id}|${c}`);
                  const on = sel.id === r.id && sel.config === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSel({ id: r.id, config: c })}
                      aria-label={`${r.q} — ${configLabel(c, plain)}: ${g ? (g.correct ? "right" : "wrong") : "not run"}`}
                      className={`justify-self-center w-6 h-6 sm:w-7 sm:h-7 border-2 border-brutal-black transition-transform ${g ? (g.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]") : "bg-white"} ${on ? "scale-110 shadow-[2px_2px_0_0_#000] outline outline-2 outline-offset-1 outline-brutal-black" : "hover:scale-105"}`}
                    />
                  );
                })}
              </li>
            ))}
          </ol>
        </div>

        {/* The detail */}
        <div className={`border-[3px] border-brutal-black bg-white shadow-[6px_6px_0_0_#000] flex flex-col ${only ? "h-[26rem]" : "h-[32rem]"} min-w-0`}>
          <div className="px-4 py-3 border-b-[3px] border-brutal-black flex flex-col gap-2">
            <span className="flex items-center gap-2">
              <span className={`${label} px-1.5 py-0.5 bg-brutal-black text-cream`}>{QUESTION_KINDS[q.kind][plain ? 1 : 0]}</span>
              {!plain && <span className="font-mono text-[10px] opacity-50">{q.id}</span>}
            </span>
            <p className="font-display font-bold text-base leading-snug line-clamp-3">{q.q}</p>
            <p className="font-mono text-[11px] leading-snug opacity-75 line-clamp-3">
              {q.kind === "unanswerable" ? (
                <T tech={`Key: must start with “I don't know based on the Northwind documents.”`} plain="The files don't say. The right answer is “I don't know”." />
              ) : (
                <>
                  {plain ? "Must mention " : "Key: must contain "}
                  {q.facts.map(group).join(plain ? " and " : "; ")}
                  {q.forbid?.length ? (plain ? `, and not lead with ${q.forbid.map(quote).join(" or ")}` : `; must not lead with ${q.forbid.map(quote).join(" or ")}`) : ""}.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 px-4 py-2.5 border-b-2 border-brutal-black/10">
            {configs.map((c, i) => {
              const g = by.get(`${sel.id}|${c}`);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSel((s) => ({ ...s, config: c }))}
                  className={`h-7 px-2 border-2 border-brutal-black font-mono text-[10px] font-bold flex items-center gap-1.5 transition-colors ${sel.config === c ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}
                  title={configLabel(c, plain)}
                >
                  <span className={`w-2.5 h-2.5 border border-current ${g ? (g.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]") : ""}`} />
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="px-4 pt-3 flex flex-col gap-1">
            <span className={`${label} opacity-60`}>{configLabel(sel.config, plain)}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 font-display text-[15px] leading-relaxed">{a ? a.answer : <span className="opacity-50">Not run.</span>}</div>
          <div className={`px-4 py-2.5 border-t-[3px] border-brutal-black font-display font-bold text-sm leading-snug ${a ? (a.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]") : "bg-white"}`}>
            {a ? (a.correct ? <T tech={`Right: ${a.reason}.`} plain="Right. Matches the answer key." /> : <T tech={`Wrong: ${a.reason}.`} plain={wrongPlain(a.reason)} />) : "—"}
          </div>
        </div>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 font-mono text-[11px] leading-snug">
        {configs.map((c, i) => (
          <li key={c} className="flex gap-2">
            <span className="font-bold">{i + 1}</span>
            <span className="opacity-70">{configLabel(c, plain)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

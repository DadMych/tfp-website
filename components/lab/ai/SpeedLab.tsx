"use client";

import { useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import { errorText } from "./rag-client";
import { LEVER_LABEL, STAGES, per1000 } from "./speed-meta";

interface Run {
  ms: { embed: number; keyword: number; vector: number; rerank: number; search: number; firstToken: number; answer: number; total: number };
  tokens: { embed: number; rerank: number; input: number; output: number };
  nano: { voyage: number; model: number };
  text: string;
  hits: { doc: string; heading: string }[];
}
interface Result {
  baseline: Run;
  lever: string;
  other: Run | null;
  remaining: number;
}

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const LEVERS = ["rerank-10", "no-rerank", "top-3", "keyword", "warm"];

/** Stage durations along the critical path. Search covers the database queries, fusion and the keyword query running alongside. */
function segments(r: Run): Record<string, number> {
  return {
    embed: r.ms.embed,
    search: Math.max(0, r.ms.search - r.ms.rerank - r.ms.embed),
    rerank: r.ms.rerank,
    firstToken: r.ms.firstToken,
    rest: Math.max(0, r.ms.answer - r.ms.firstToken),
  };
}

function Row({ name, run, scale }: { name: string; run: Run | null; scale: number }) {
  const { plain } = useExplain();
  const seg = run ? segments(run) : null;
  return (
    <div className="flex flex-col gap-2 p-4 h-[13.5rem] min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display font-bold text-[15px] truncate">{name}</span>
        <span className="font-mono text-[22px] font-bold tabular-nums shrink-0">{run ? `${(run.ms.total / 1000).toFixed(2)} s` : "—"}</span>
      </div>
      <div className="relative h-9 border-2 border-brutal-black bg-cream flex overflow-hidden" aria-label={run ? `total ${run.ms.total} ms` : "not run yet"}>
        {seg &&
          STAGES.map((s) =>
            seg[s.key] > 0 ? (
              <span key={s.key} title={`${s.tech}: ${seg[s.key]} ms`} className="h-full border-r-2 border-brutal-black last:border-r-0" style={{ width: `${(seg[s.key] / scale) * 100}%`, background: s.color }} />
            ) : null
          )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-[12px]">
        <div>
          <dt className={`${label} opacity-60`}>
            <T tech="First token" plain="Starts typing" />
          </dt>
          <dd className="font-mono font-bold tabular-nums">{run ? `${((run.ms.search + run.ms.firstToken) / 1000).toFixed(2)} s` : "—"}</dd>
        </div>
        <div>
          <dt className={`${label} opacity-60`}>
            <T tech="Per 1,000 answers" plain="1,000 answers cost" />
          </dt>
          <dd className="font-mono font-bold tabular-nums">{run ? per1000(run.nano.voyage + run.nano.model) : "—"}</dd>
        </div>
        <div>
          <dt className={`${label} opacity-60`}>
            <T tech="Prompt tokens" plain="Text it reads" />
          </dt>
          <dd className="font-mono font-bold tabular-nums">{run ? `${run.tokens.input.toLocaleString("en")}${plain ? " tokens" : ""}` : "—"}</dd>
        </div>
      </dl>
      <p className="text-[13px] leading-snug line-clamp-3 min-h-0">{run ? run.text : <span className="opacity-40">{plain ? "The answer appears here." : "Answer text"}</span>}</p>
    </div>
  );
}

export default function SpeedLab({ presets }: { presets: string[] }) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [q, setQ] = useState(presets[0]);
  const [lever, setLever] = useState("rerank-10");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (busy || q.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      setRes(await labPost<Result>("/api/lab/ai/speed", session, { question: q, lever }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const shown = res && res.lever === lever ? res : null;
  const scale = Math.max(3000, shown?.baseline.ms.total ?? 0, shown?.other?.ms.total ?? 0);
  const name = (k: string) => (plain ? LEVER_LABEL[k].plain : LEVER_LABEL[k].tech);

  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Example questions">
          {presets.map((p) => (
            <button key={p} type="button" onClick={() => setQ(p)} aria-pressed={q === p} className={`shrink-0 max-w-[18rem] truncate h-9 px-3 border-2 border-brutal-black font-display text-[13px] ${q === p ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}>
              {p}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} aria-label="Question" className="h-12 px-3 border-[3px] border-brutal-black bg-white font-display text-[15px] focus:outline-none focus:bg-brutal-yellow/20" />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Compare the baseline with">
          <span className={`${label} mr-1`}>
            <T tech="Against" plain="Compare with" />
          </span>
          {LEVERS.map((k) => (
            <button key={k} type="button" onClick={() => setLever(k)} aria-pressed={lever === k} className={`h-9 px-3 border-2 border-brutal-black font-display text-[13px] ${lever === k ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}>
              {name(k)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={run} disabled={busy} className="shrink-0 h-12 px-6 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
            {busy ? "…" : plain ? "Time it" : "Run both"}
          </button>
          <span className={`${label} opacity-50 truncate`}>
            {error ? <span className="text-[#D4006A] normal-case tracking-normal font-display text-sm">{error}</span> : res ? `${res.remaining} ${plain ? "tries left this hour" : "runs left this hour"}` : plain ? "One after the other, so they don't slow each other down" : "Sequential, so they don't share the network"}
          </span>
        </div>
      </Stage>

      <div className="grid grid-cols-1 md:grid-cols-2 border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] divide-y-[3px] md:divide-y-0 md:divide-x-[3px] divide-brutal-black">
        <Row name={name("baseline")} run={shown?.baseline ?? null} scale={scale} />
        <Row name={name(lever)} run={shown?.other ?? null} scale={scale} />
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Stages">
        {STAGES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-[12px]">
            <span className="w-3.5 h-3.5 border-2 border-brutal-black" style={{ background: s.color }} />
            <T tech={s.tech} plain={s.plain} />
          </li>
        ))}
      </ul>
    </div>
  );
}

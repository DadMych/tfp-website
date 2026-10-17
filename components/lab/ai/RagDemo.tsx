"use client";

import { useEffect, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { RunButton, Stage } from "@/components/lab/money/ui";
import { labGet, useLabSession } from "@/lib/lab/client";
import { EVALSET } from "@/lib/rag/evalset";
import { kindLabel } from "@/lib/rag/kinds";
import { CAREFUL, CAREFUL_KEY, type Cfg, QUICK, QUICK_KEY, cfgKey as key } from "@/lib/rag/presets";
import { type AskResult, type Source, ask as askApi, errorText, wrongPlain } from "./rag-client";

type Result = AskResult;
export type Score = { config: string; retrieval: number; answers: number | null };

const GROUPS: { label: string; plain: string; ids: string[] }[] = [
  { label: "Changed prices", plain: "Old prices", ids: ["s1", "s4", "s5"] },
  { label: "Paraphrase", plain: "In other words", ids: ["p2", "p6", "p7"] },
  { label: "Traps", plain: "Trick questions", ids: ["x4", "x1", "x3"] },
  { label: "Buried in mail", plain: "Only in an email", ids: ["b7", "b2", "b14"] },
  { label: "Cross-lingual", plain: "Other languages", ids: ["l2", "l1", "l4"] },
  { label: "Product codes", plain: "Product codes", ids: ["e1", "e3"] },
  { label: "Not covered", plain: "Not in the docs", ids: ["u4", "u5"] },
];
const evalQ = (id: string) => EVALSET.find((q) => q.id === id)!.q;

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (x: number) => `${Math.round(x * 100)}%`;

/* ── Controls ── */

function Seg<V extends string | boolean>({ label, value, options, onChange }: { label: React.ReactNode; value: V; options: { v: V; tech: string; plain: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{label}</span>
      <div className="flex border-[3px] border-brutal-black bg-white" role="radiogroup">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 min-w-0 h-10 px-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.05em] leading-tight border-l-[3px] border-brutal-black first:border-l-0 transition-colors ${value === o.v ? "bg-brutal-black text-cream" : "hover:bg-brutal-yellow"}`}
          >
            <T tech={o.tech} plain={o.plain} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Answer({ text, hover, setHover }: { text: string; hover: number | null; setHover: (n: number | null) => void }) {
  return (
    <>
      {text.split(/(\[\d+\])/).map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (!m) return <span key={i}>{part}</span>;
        const n = Number(m[1]);
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 mx-0.5 px-1 align-[0.1em] border-2 border-brutal-black font-mono text-[10px] font-bold ${hover === n ? "bg-brutal-black text-cream" : "bg-brutal-yellow"}`}
            aria-label={`Source ${n}`}
          >
            {n}
          </button>
        );
      })}
    </>
  );
}

function SourceRow({ s, n, lit }: { s: Source | undefined; n: number; lit: boolean }) {
  const { plain } = useExplain();
  if (!s)
    return (
      <li className="h-[5.75rem] border-[3px] border-dashed border-brutal-black/30 flex items-center gap-3 px-3">
        <span className="font-mono text-[11px] font-bold opacity-30">{n}</span>
      </li>
    );
  const ranks = [
    s.keywordRank != null && `${plain ? "words" : "keyword"} #${s.keywordRank}`,
    s.vectorRank != null && `${plain ? "meaning" : "vector"} #${s.vectorRank}`,
    s.rerankScore != null && `${plain ? "fit" : "rerank"} ${s.rerankScore.toFixed(2)}`,
  ].filter(Boolean);
  return (
    <li className={`h-[5.75rem] border-[3px] border-brutal-black flex gap-3 px-3 py-2 transition-colors ${lit ? "bg-brutal-yellow" : s.status === "archived" ? "bg-[#FFE4F1]" : "bg-white"}`}>
      <span className={`shrink-0 w-6 h-6 flex items-center justify-center border-2 border-brutal-black font-mono text-[11px] font-bold ${lit ? "bg-brutal-black text-cream" : "bg-white"}`}>{n}</span>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display font-bold text-sm leading-tight truncate">{s.title}</span>
          {s.status === "archived" && <span className="shrink-0 bg-[#FF5CAA] border-2 border-brutal-black px-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em]">Archived</span>}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-60 truncate">
          {kindLabel(s.kind, plain)} · {s.updated}
          {ranks.length ? ` · ${ranks.join(" · ")}` : ""}
        </span>
        <p className="font-mono text-[11px] leading-snug opacity-80 line-clamp-2" title={s.text}>
          {s.text}
        </p>
      </div>
    </li>
  );
}

/* ── The console ── */

export default function RagDemo({ scores }: { scores: Score[] }) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [cfg, setCfg] = useState<Cfg>(QUICK);
  const [group, setGroup] = useState(0);
  const [q, setQ] = useState(evalQ("b7"));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    labGet<{ remaining: number }>("/api/lab/ai/rag/ask", session).then(
      (r) => setRemaining(r.remaining),
      () => {}
    );
  }, [session]);

  const ask = async (question = q) => {
    if (busy || question.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const r = await askApi(session, question, cfg);
      setRes(r);
      setRemaining(r.remaining);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof Cfg>(k: K) => (v: Cfg[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const score = scores.find((s) => s.config === key(cfg));
  const preset = key(cfg) === QUICK_KEY ? "quick" : key(cfg) === CAREFUL_KEY ? "careful" : null;
  const seconds = res ? ((res.ms.search + res.ms.answer) / 1000).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-5">
        {/* Setup */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mr-1">
              <T tech="Preset" plain="Start from" />
            </span>
            {(
              [
                ["quick", QUICK, "The usual first build", "The quick version"],
                ["careful", CAREFUL, "The build that holds", "The careful version"],
              ] as const
            ).map(([id, c, tech, pl]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCfg(c)}
                aria-pressed={preset === id}
                className={`h-10 px-3 border-[3px] border-brutal-black font-display font-bold text-sm transition-colors ${preset === id ? (id === "quick" ? "bg-[#FF5CAA]" : "bg-[#C6FF3D]") : "bg-white hover:bg-brutal-yellow"}`}
              >
                {plain ? pl : tech}
              </button>
            ))}
            <span className="font-mono text-[11px] leading-snug opacity-70 basis-full sm:basis-auto sm:ml-auto tabular-nums h-[2lh] sm:h-[1lh]">
              {score
                ? score.answers != null
                  ? plain
                    ? `This setup got ${pct(score.answers)} of our ${EVALSET.length} test questions right.`
                    : `Test set: ${pct(score.answers)} answers right, ${pct(score.retrieval)} retrieval.`
                  : plain
                    ? `This setup found the right piece for ${pct(score.retrieval)} of our test questions.`
                    : `Test set: ${pct(score.retrieval)} retrieval (answers not graded for this setup).`
                : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Seg
              label={<T tech="Chunking" plain="Cut documents into" />}
              value={cfg.chunks}
              onChange={set("chunks")}
              options={[
                { v: "fixed", tech: "400 chars", plain: "Equal pieces" },
                { v: "section", tech: "Sections", plain: "Sections" },
              ]}
            />
            <Seg
              label={<T tech="Retrieval" plain="Search by" />}
              value={cfg.search}
              onChange={set("search")}
              options={[
                { v: "keyword", tech: "Keyword", plain: "Words" },
                { v: "vector", tech: "Vector", plain: "Meaning" },
                { v: "hybrid", tech: "Hybrid", plain: "Both" },
              ]}
            />
            <Seg
              label={<T tech="Rerank top 20" plain="Second look" />}
              value={cfg.rerank}
              onChange={set("rerank")}
              options={[
                { v: false, tech: "Off", plain: "Off" },
                { v: true, tech: "On", plain: "On" },
              ]}
            />
            <Seg
              label={<T tech="Archived docs" plain="Out-of-date files" />}
              value={cfg.currentOnly}
              onChange={set("currentOnly")}
              options={[
                { v: false, tech: "Include", plain: "Read them" },
                { v: true, tech: "Exclude", plain: "Skip them" },
              ]}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex flex-col gap-3 border-t-[3px] border-brutal-black pt-5">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1" role="tablist">
            {GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                role="tab"
                aria-selected={group === i}
                onClick={() => setGroup(i)}
                className={`shrink-0 h-8 px-2.5 border-2 border-brutal-black font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${group === i ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}
              >
                {plain ? g.plain : g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:h-[4.25rem] content-start overflow-hidden">
            {GROUPS[group].ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setQ(evalQ(id));
                  ask(evalQ(id));
                }}
                disabled={busy}
                className="text-left px-2.5 py-1.5 border-2 border-dashed border-brutal-black font-display text-sm leading-tight hover:bg-brutal-yellow hover:border-solid disabled:opacity-50 truncate max-w-full"
              >
                {evalQ(id)}
              </button>
            ))}
          </div>
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={300}
              aria-label="Your question"
              placeholder="Ask anything about Northwind Studio"
              className="flex-1 min-w-0 h-12 px-4 border-[3px] border-brutal-black bg-cream font-display text-base focus:outline-none focus:bg-white"
            />
            <RunButton onClick={() => ask()} busy={busy} size="md">
              {busy ? <T tech="Retrieving…" plain="Reading…" /> : "Ask"}
            </RunButton>
          </form>
        </div>

        {/* Result */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 border-t-[3px] border-brutal-black pt-5">
          <div className="flex flex-col gap-2 min-w-0">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              <T tech="Top 5 chunks sent to the model" plain="The 5 pieces it read" />
            </span>
            <ol className={`flex flex-col gap-1.5 transition-opacity ${busy ? "opacity-40" : ""}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <SourceRow key={n} n={n} s={res?.hits[n - 1]} lit={hover === n} />
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              <T tech="Answer · claude-haiku-5-5" plain="What it answered" />
            </span>
            <div className={`h-[15rem] lg:h-[20.5rem] overflow-y-auto border-[3px] border-brutal-black bg-cream p-4 font-display text-base md:text-lg leading-relaxed transition-opacity ${busy ? "opacity-40" : ""}`} aria-live="polite">
              {res ? (
                <Answer text={res.answer} hover={hover} setHover={setHover} />
              ) : (
                <span className="opacity-50">
                  <T
                    tech="Pick a question or type one. Start with the quick build, then switch to the careful one and ask again."
                    plain="Pick a question or type your own. Try the quick version first, then the careful one, and compare."
                  />
                </span>
              )}
            </div>
            <div
              className={`h-[3.5rem] flex items-center border-[3px] border-brutal-black px-3 font-display font-bold text-sm leading-snug ${
                !res || !res.grade ? "bg-white" : res.grade.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]"
              }`}
            >
              {!res ? (
                <span className="opacity-50">
                  <T tech="Test-set questions are graded against an answer key." plain="Questions from the list get checked against an answer key." />
                </span>
              ) : res.grade ? (
                res.grade.correct ? (
                  <T tech={`Right. ${res.grade.reason === "declined" ? "Declined, as it should." : "Every fact in the key is there."}`} plain={res.grade.reason === "declined" ? "Right: it isn't in the documents, and it said so." : "Right. Matches the answer key."} />
                ) : (
                  <T tech={`Wrong: ${res.grade.reason}.`} plain={wrongPlain(res.grade.reason)} />
                )
              ) : (
                <span className="font-normal">
                  <T tech="Your own question: no answer key. Check it against the sources." plain="Your own question, so no answer key. Hover a number to see where it came from." />
                </span>
              )}
            </div>
            <span className={`font-mono text-[11px] tabular-nums h-[2lh] leading-snug ${error ? "font-bold text-[#D4006A]" : "opacity-70"}`}>
              {error ??
                (res
                  ? plain
                    ? `${seconds} s · cost $${res.costUsd.toFixed(5)}${remaining != null ? ` · ${remaining} questions left this hour` : ""}`
                    : `search ${res.ms.search} ms · answer ${res.ms.answer} ms · ${fmt(res.tokens.input)} in / ${res.tokens.output} out · $${res.costUsd.toFixed(5)}${remaining != null ? ` · ${remaining} left/h` : ""}`
                  : "")}
            </span>
          </div>
        </div>
      </Stage>
    </div>
  );
}

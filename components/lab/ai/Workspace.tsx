"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { labGet, useLabSession } from "@/lib/lab/client";
import { EVALSET } from "@/lib/rag/evalset";
import { KINDS, type KindId, kindLabel } from "@/lib/rag/kinds";
import { CAREFUL, QUICK } from "@/lib/rag/presets";
import Markdown from "./Markdown";
import { type AskResult, type FullDoc, type Library, ask, citeParts, errorText, loadDoc, section, wrongPlain } from "./rag-client";

type Side = "quick" | "careful";
type Mode = Side | "both";
type Slot = { status: "pending" } | { status: "done"; res: AskResult } | { status: "error"; message: string };
type Turn = { id: number; q: string; slots: Partial<Record<Side, Slot>> };
type Sheet = { type: "doc"; slug: string; highlight?: string; n?: number } | { type: "prompt"; res: AskResult } | null;

const STARTERS = ["b7", "l2", "x3", "p2", "s4", "u4"].map((id) => EVALSET.find((q) => q.id === id)!.q);
const SIDE = {
  quick: { tech: "First build", plain: "Quick version", color: "#FF5CAA", tint: "#FFF0F7" },
  careful: { tech: "Careful build", plain: "Careful version", color: "#C6FF3D", tint: "#F6FFE6" },
} as const;

const fmt = (n: number) => n.toLocaleString("en-US");
const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

/* ── Library ── */

function LibraryPane({ lib, active, open }: { lib: Library | null; active: string | null; open: (slug: string) => void }) {
  const { plain } = useExplain();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindId | "all" | "archived">("all");
  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (lib?.docs ?? []).filter((d) => (kind === "all" || (kind === "archived" ? d.archived : d.kind === kind)) && (!q || d.title.toLowerCase().includes(q)));
  }, [lib, query, kind]);
  const chip = (on: boolean) => `shrink-0 h-7 px-2 border-2 border-brutal-black ${label} !tracking-[0.08em] transition-colors ${on ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`;

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex flex-col gap-3 p-4 border-b-[3px] border-brutal-black">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display font-black uppercase tracking-[-0.02em] text-lg leading-none">
            <T tech="The drive" plain="Their files" />
          </span>
          <span className={`${label} opacity-50 tabular-nums`}>{lib ? `${docs.length} / ${lib.docs.length}` : "…"}</span>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={plain ? "Find a file by name" : "Filter by title"}
          aria-label="Filter documents"
          className="h-9 px-3 border-2 border-brutal-black bg-cream font-display text-sm focus:outline-none focus:bg-white"
        />
        <div className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none]">
          <button type="button" className={chip(kind === "all")} onClick={() => setKind("all")}>All</button>
          <button type="button" className={`${chip(kind === "archived")} ${kind === "archived" ? "" : "!bg-[#FFD1E8]"}`} onClick={() => setKind("archived")}>
            {plain ? "Out of date" : "Archived"}
          </button>
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={chip(kind === k.id)} onClick={() => setKind(k.id)}>
              {plain ? k.plain : k.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto divide-y-2 divide-brutal-black/10" aria-label="Documents">
        {!lib &&
          Array.from({ length: 9 }, (_, i) => (
            <li key={i} className="px-4 py-3 flex flex-col gap-2">
              <span className="h-3 w-4/5 bg-brutal-black/10 animate-pulse" />
              <span className="h-2 w-2/5 bg-brutal-black/10 animate-pulse" />
            </li>
          ))}
        {docs.map((d) => (
          <li key={d.slug}>
            <button
              type="button"
              onClick={() => open(d.slug)}
              className={`w-full text-left px-4 py-2.5 flex flex-col gap-1 transition-colors ${active === d.slug ? "bg-brutal-yellow" : "hover:bg-cream"}`}
            >
              <span className="font-display font-bold text-[13px] leading-snug line-clamp-2">{d.title}</span>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] opacity-60">
                <span className="truncate">{kindLabel(d.kind, plain)}</span>
                <span className="tabular-nums shrink-0">{d.updated}</span>
                {d.archived && <span className="shrink-0 bg-[#FF5CAA] text-brutal-black px-1 font-bold opacity-100">{plain ? "old" : "archived"}</span>}
              </span>
            </button>
          </li>
        ))}
        {lib && docs.length === 0 && <li className="px-4 py-6 font-display text-sm opacity-60">Nothing with that name.</li>}
      </ul>
    </div>
  );
}

/* ── Conversation ── */

function Cites({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  return (
    <>
      {citeParts(text).map((p, i) =>
        "n" in p ? (
          <button
            key={i}
            type="button"
            onClick={() => onCite(p.n)}
            className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.15rem] mx-0.5 px-1 align-[0.12em] border-2 border-brutal-black bg-brutal-yellow font-mono text-[10px] font-bold hover:bg-brutal-black hover:text-brutal-yellow transition-colors"
            aria-label={`Open source ${p.n}`}
          >
            {p.n}
          </button>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

function AnswerCard({ side, slot, selected, onSelect, onCite }: { side: Side; slot: Slot; selected: boolean; onSelect: () => void; onCite: (res: AskResult, n: number) => void }) {
  const { plain } = useExplain();
  const s = SIDE[side];
  return (
    <div className={`flex flex-col min-w-0 border-[3px] border-brutal-black bg-white transition-shadow ${selected ? "shadow-[5px_5px_0_0_#000]" : ""}`}>
      <div className="flex items-center justify-between gap-2 px-3 h-9 border-b-[3px] border-brutal-black" style={{ background: s.tint }}>
        <span className={`${label} flex items-center gap-2`}>
          <span className="w-2.5 h-2.5 border-2 border-brutal-black" style={{ background: s.color }} />
          {plain ? s.plain : s.tech}
        </span>
        {slot.status === "done" && (
          <button type="button" onClick={onSelect} className={`${label} !tracking-[0.12em] px-1.5 py-0.5 border-2 border-brutal-black transition-colors ${selected ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}>
            X-ray
          </button>
        )}
      </div>
      <div className="px-4 py-3 font-display text-[15px] leading-relaxed min-h-[6.5rem]">
        {slot.status === "pending" && (
          <div className="flex flex-col gap-2 pt-1" aria-label="Thinking">
            {[92, 100, 76, 58].map((w, i) => (
              <span key={i} className="h-3 bg-brutal-black/10 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
        {slot.status === "error" && <p className="font-bold text-[#D4006A]">{slot.message}</p>}
        {slot.status === "done" && <Cites text={slot.res.answer} onCite={(n) => onCite(slot.res, n)} />}
      </div>
      {slot.status === "done" && (
        <>
          <ol className="px-3 pb-3 flex flex-wrap gap-1.5">
            {slot.res.hits.map((h) => (
              <li key={h.n} className="min-w-0 max-w-[15rem]">
                <button
                  type="button"
                  onClick={() => onCite(slot.res, h.n)}
                  title={h.title}
                  className={`flex items-center gap-1.5 max-w-full h-7 pl-1 pr-2 border-2 border-brutal-black font-mono text-[10px] hover:bg-brutal-yellow transition-colors ${h.status === "archived" ? "bg-[#FFE4F1]" : "bg-cream"}`}
                >
                  <span className="shrink-0 w-4 h-4 flex items-center justify-center bg-brutal-black text-cream font-bold">{h.n}</span>
                  <span className="truncate">{h.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 border-t-2 border-brutal-black/10 font-mono text-[10px] uppercase tracking-[0.06em]">
            {slot.res.grade && (
              <span className={`px-1.5 py-0.5 border-2 border-brutal-black font-bold ${slot.res.grade.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]"}`} title={slot.res.grade.reason}>
                {slot.res.grade.correct ? (plain ? "Matches the key" : "Correct") : plain ? wrongPlain(slot.res.grade.reason).split(":")[0] : `Wrong: ${slot.res.grade.reason}`}
              </span>
            )}
            <span className="opacity-60 tabular-nums">
              {((slot.res.ms.search + slot.res.ms.answer) / 1000).toFixed(1)} s · ${slot.res.costUsd.toFixed(5)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── X-ray ── */

function Step({ n, title, ms, how, children }: { n: number; title: React.ReactNode; ms?: number | null; how?: string | null; children: React.ReactNode }) {
  return (
    <li className="relative pl-9 pb-5 last:pb-0">
      <span className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-brutal-black/15" aria-hidden="true" />
      <span className="absolute left-0 top-0 w-6 h-6 flex items-center justify-center bg-brutal-black text-cream font-mono text-[11px] font-bold">{n}</span>
      <div className="flex items-baseline justify-between gap-2 min-h-6">
        <span className="font-display font-bold text-sm leading-tight">{title}</span>
        <span className="flex items-baseline gap-2 shrink-0">
          {ms != null && <span className="font-mono text-[10px] tabular-nums opacity-50">{ms} ms</span>}
          {how && (
            <Link href={how} className={`${label} !tracking-[0.1em] underline decoration-dotted underline-offset-2 hover:bg-brutal-yellow`}>
              How
            </Link>
          )}
        </span>
      </div>
      <div className="mt-1.5 flex flex-col gap-1.5 font-mono text-[11px] leading-snug">{children}</div>
    </li>
  );
}

function CandList({ list, empty }: { list: AskResult["trace"]["keyword"]; empty: React.ReactNode }) {
  if (!list.length) return <span className="opacity-50">{empty}</span>;
  return (
    <ol className="flex flex-col">
      {list.map((c, i) => (
        <li key={c.id} className={`flex items-center gap-2 py-0.5 ${c.picked ? "" : "opacity-45"}`}>
          <span className="w-4 shrink-0 tabular-nums text-right opacity-60">{i + 1}</span>
          <span className={`w-1.5 h-1.5 shrink-0 ${c.picked ? "bg-brutal-black" : "border border-brutal-black"}`} aria-label={c.picked ? "sent to the model" : undefined} />
          <span className="truncate">
            {c.title}
            {c.heading && <span className="opacity-60"> › {section(c.heading)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Xray({ res, chapters, openPrompt }: { res: AskResult | null; chapters: string[]; openPrompt: (r: AskResult) => void }) {
  const { plain } = useExplain();
  const how = (slug: string) => (chapters.includes(slug) ? `/lab/ai/${slug}` : null);
  if (!res)
    return (
      <div className="p-5 flex flex-col gap-3">
        <span className="font-display font-black uppercase tracking-[-0.02em] text-lg leading-none">X-ray</span>
        <p className="font-display text-sm leading-relaxed opacity-70">
          <T
            tech="Ask something. Every stage of the pipeline lands here: the query embedding, both candidate lists, fusion and rerank, the exact prompt, tokens and cost."
            plain="Ask something. Every step shows up here: how it searched, what it found, what it handed to the AI, and what that cost."
          />
        </p>
      </div>
    );
  const [chunks, search, rr] = res.config.split("/");
  const vec = search !== "keyword";
  const kw = search !== "vector";
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-display font-black uppercase tracking-[-0.02em] text-lg leading-none">X-ray</span>
        <span className={`${label} opacity-50`}>
          {plain
            ? `${chunks === "fixed" ? "Equal pieces" : "Sections"} · ${{ keyword: "words", vector: "meaning", hybrid: "words + meaning" }[search]}${rr === "rerank" ? " · second look" : ""}`
            : res.config}
        </span>
      </div>
      <ol className="flex flex-col">
        <Step n={1} title={<T tech={chunks === "fixed" ? "Index: 400-char windows" : "Index: one chunk per section"} plain={chunks === "fixed" ? "Files cut into equal pieces" : "Files cut by section"} />} how={how("chunking")}>
          <span className="opacity-70">
            <T
              tech={chunks === "fixed" ? "Blind to structure. Headings and tables get split." : "Each chunk keeps its title, date and ARCHIVED flag."}
              plain={chunks === "fixed" ? "Fast, but a price can end up in a different piece from its label." : "Each piece keeps the file's name and date on it."}
            />
          </span>
        </Step>
        <Step n={2} title={<T tech="Embed the question · voyage-4" plain="Turn the question into numbers" />} ms={vec ? res.ms.embed : null}>
          <span className="opacity-70">
            {vec ? (res.tokens.embed ? `${res.tokens.embed} tokens → 1,024 numbers` : plain ? "Asked before, reused." : "Cache hit, 0 tokens.") : plain ? "Skipped: this version only matches words." : "Skipped: keyword-only."}
          </span>
        </Step>
        <Step n={3} title={<T tech="Keyword search · Postgres FTS" plain="Match the words" />} ms={kw ? res.ms.keyword : null} how={how("retrieval")}>
          <CandList list={res.trace.keyword} empty={plain ? "Skipped." : "Not in this pipeline."} />
        </Step>
        <Step n={4} title={<T tech="Vector search · pgvector" plain="Match the meaning" />} ms={vec ? res.ms.vector : null} how={how("retrieval")}>
          <CandList list={res.trace.vector} empty={plain ? "Skipped: this version only matches words." : "Not in this pipeline."} />
        </Step>
        <Step n={5} title={<T tech={rr === "rerank" ? "Fuse (RRF) + rerank-3" : "Fuse (RRF), top 5"} plain={rr === "rerank" ? "Second look: keep the best 5" : "Keep the top 5"} />} ms={rr === "rerank" ? res.ms.rerank : null}>
          <span className="opacity-70">{plain ? `${res.trace.fused} candidates → 5` : `${res.trace.fused} unique candidates → top 5`}</span>
          <ol className="flex flex-col gap-1">
            {res.hits.map((h) => (
              <li key={h.n} className="flex items-center gap-2">
                <span className="w-4 h-4 shrink-0 flex items-center justify-center bg-brutal-black text-cream text-[9px] font-bold">{h.n}</span>
                <span className="truncate flex-1 min-w-0">{h.title}</span>
                {h.rerankScore != null && (
                  <span className="relative w-14 h-2.5 shrink-0 border border-brutal-black bg-white" title={h.rerankScore.toFixed(2)}>
                    <span className="absolute inset-y-0 left-0 bg-brutal-black" style={{ width: `${Math.max(4, h.rerankScore * 100)}%` }} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Step>
        <Step n={6} title={<T tech="Prompt · claude-haiku-5-5" plain="What the AI was given" />} how={how("cite-or-decline")}>
          <span className="opacity-70">
            {plain ? `The 5 pieces, the rules and your question: ${fmt(res.tokens.input)} tokens.` : `System + 5 sources + question: ${fmt(res.tokens.input)} tokens in.`}
          </span>
          <button type="button" onClick={() => openPrompt(res)} className={`w-fit ${label} !tracking-[0.1em] px-2 py-1 border-2 border-brutal-black bg-white hover:bg-brutal-yellow transition-colors`}>
            <T tech="Read the exact prompt" plain="Read exactly what it got" />
          </button>
        </Step>
        <Step n={7} title={<T tech="Answer" plain="The answer" />} ms={res.ms.answer} how={res.grade ? how("test-set") : how("cite-or-decline")}>
          <span className="opacity-70">
            {fmt(res.tokens.output)} {plain ? "tokens written" : "tokens out"} · ${res.costUsd.toFixed(5)}
          </span>
          {res.grade && (
            <span className={`w-fit px-1.5 py-0.5 border-2 border-brutal-black font-bold ${res.grade.correct ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]"}`}>
              {res.grade.correct ? (plain ? "Matches the answer key" : `Correct: ${res.grade.reason}`) : plain ? wrongPlain(res.grade.reason) : `Wrong: ${res.grade.reason}`}
            </span>
          )}
        </Step>
      </ol>
    </div>
  );
}

/* ── Sheet over the conversation: a document or the exact prompt ── */

function DocSheet({ slug, highlight, n }: { slug: string; highlight?: string; n?: number }) {
  const { plain } = useExplain();
  const [doc, setDoc] = useState<FullDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mark = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    loadDoc(slug).then(
      (d) => live && setDoc(d),
      (e) => live && setError(errorText(e))
    );
    return () => {
      live = false;
    };
  }, [slug]);

  useEffect(() => {
    const el = mark.current;
    const box = scroller.current;
    if (!doc || !el || !box) return;
    box.scrollTo({ top: Math.max(0, el.offsetTop - 120), behavior: "smooth" });
  }, [doc, highlight]);

  if (error) return <p className="p-6 font-display font-bold text-[#D4006A]">{error}</p>;
  if (!doc || doc.slug !== slug)
    return (
      <div className="p-6 flex flex-col gap-3">
        {[60, 100, 90, 95, 70].map((w, i) => (
          <span key={i} className="h-3 bg-brutal-black/10 animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  const words = doc.body.split(/\s+/).length;
  return (
    <div ref={scroller} className="relative h-full overflow-y-auto">
      <div className="px-5 md:px-8 py-6 flex flex-col gap-5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
          <span className="px-1.5 py-0.5 bg-brutal-black text-cream">{kindLabel(doc.kind, plain)}</span>
          <span className="opacity-60 tabular-nums">
            {plain ? "Last changed" : "Updated"} {doc.updated} · {fmt(words)} words · {doc.chunks.section.length} {plain ? "sections" : "section chunks"} · {doc.chunks.fixed.length} {plain ? "equal pieces" : "fixed chunks"}
          </span>
        </div>
        {doc.archived && (
          <p className="border-[3px] border-brutal-black bg-[#FF5CAA] px-4 py-2.5 font-display font-bold text-sm leading-snug">
            <T tech="Archived. Still in the drive and still searchable, unless the pipeline filters it out." plain="Out of date. Still in the drive, like old files in every company. A careless bot will quote it." />
          </p>
        )}
        {highlight && n != null && (
          <p className={`${label} !tracking-[0.12em] flex items-center gap-2`}>
            <span className="w-5 h-5 flex items-center justify-center bg-brutal-black text-cream">{n}</span>
            <T tech="Highlighted: the chunk sent to the model as this source" plain="Highlighted: the piece the AI read" />
          </p>
        )}
        <Markdown body={doc.body} highlight={highlight} markRef={mark} />
      </div>
    </div>
  );
}

function PromptSheet({ res }: { res: AskResult }) {
  const pre = "whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed border-[3px] border-brutal-black p-4";
  return (
    <div className="h-full overflow-y-auto px-5 md:px-8 py-6 flex flex-col gap-5 max-w-3xl">
      <p className="font-display text-sm leading-relaxed opacity-80">
        <T
          tech={`Exactly what claude-haiku-5-5 received: ${fmt(res.tokens.input)} input tokens. Nothing else, no memory, no browsing.`}
          plain={`This is everything the AI got: the rules, the 5 pieces it found, your question. ${fmt(res.tokens.input)} tokens. It knows nothing else about Northwind.`}
        />
      </p>
      <div className="flex flex-col gap-2">
        <span className={label}>System</span>
        <pre className={`${pre} bg-brutal-black text-cream`}>{res.prompt.system}</pre>
      </div>
      <div className="flex flex-col gap-2">
        <span className={label}>User</span>
        <pre className={`${pre} bg-cream`}>{res.prompt.user}</pre>
      </div>
    </div>
  );
}

/* ── The workspace ── */

export default function Workspace({ chapters }: { chapters: string[] }) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [lib, setLib] = useState<Library | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("both");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [selected, setSelected] = useState<{ turn: number; side: Side } | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [tab, setTab] = useState<"docs" | "ask" | "xray">("ask");
  const [q, setQ] = useState("");
  const thread = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    labGet<{ library: Library; remaining: number }>("/api/lab/ai/rag/ask", session).then(
      (r) => {
        setLib(r.library);
        setRemaining(r.remaining);
      },
      () => setLib({ words: 0, chunks: 0, docs: [] })
    );
  }, [session]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  const busy = turns.some((t) => Object.values(t.slots).some((s) => s?.status === "pending"));

  const send = useCallback(
    (question: string) => {
      const text = question.trim().replace(/\s+/g, " ");
      if (text.length < 3 || busy) return;
      const id = nextId.current++;
      const sides: Side[] = mode === "both" ? ["quick", "careful"] : [mode];
      setTurns((ts) => [...ts.slice(-11), { id, q: text, slots: Object.fromEntries(sides.map((s) => [s, { status: "pending" }])) }]);
      setSheet(null);
      setQ("");
      setTab("ask");
      const put = (side: Side, slot: Slot) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, slots: { ...t.slots, [side]: slot } } : t)));
      sides.forEach((side) =>
        ask(session, text, side === "quick" ? QUICK : CAREFUL).then(
          (res) => {
            put(side, { status: "done", res });
            setRemaining(res.remaining);
            setSelected((cur) => (cur?.turn === id && side === "quick" ? cur : { turn: id, side }));
          },
          (e) => put(side, { status: "error", message: errorText(e) })
        )
      );
    },
    [busy, mode, session]
  );

  const xrayRes = useMemo(() => {
    const t = turns.find((x) => x.id === selected?.turn);
    const s = selected && t?.slots[selected.side];
    return s && s.status === "done" ? s.res : null;
  }, [turns, selected]);

  const cite = (res: AskResult, n: number) => {
    const h = res.hits[n - 1];
    if (!h) return;
    setSheet({ type: "doc", slug: h.doc, highlight: h.text, n });
    setTab("ask");
  };

  const modeBtn = (m: Mode, tech: string, pl: string) => (
    <button
      key={m}
      type="button"
      role="radio"
      aria-checked={mode === m}
      onClick={() => setMode(m)}
      className={`h-8 px-2.5 ${label} !tracking-[0.1em] border-l-2 border-brutal-black first:border-l-0 transition-colors ${mode === m ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}
    >
      {plain ? pl : tech}
    </button>
  );

  const pane = (id: typeof tab) => `${tab === id ? "flex" : "hidden"} lg:flex flex-col min-h-0 min-w-0`;

  return (
    <div className="border-[3px] border-brutal-black bg-white text-brutal-black shadow-[10px_10px_0_0_#000] flex flex-col h-[min(52rem,calc(100svh-6rem))] min-h-[36rem]">
      {/* Mobile tabs */}
      <div className="lg:hidden grid grid-cols-3 border-b-[3px] border-brutal-black" role="tablist">
        {(
          [
            ["docs", "Files"],
            ["ask", "Ask"],
            ["xray", "X-ray"],
          ] as const
        ).map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-11 ${label} border-l-[3px] border-brutal-black first:border-l-0 ${tab === id ? "bg-brutal-black text-cream" : "bg-white"}`}>
            {name}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)_21rem] xl:grid-cols-[18.5rem_minmax(0,1fr)_23rem]">
        <aside className={`${pane("docs")} lg:border-r-[3px] border-brutal-black bg-white`}>
          <LibraryPane
            lib={lib}
            active={sheet?.type === "doc" ? sheet.slug : null}
            open={(slug) => {
              setSheet({ type: "doc", slug });
              setTab("ask");
            }}
          />
        </aside>

        <section className={`${pane("ask")} relative bg-cream`} aria-label="Conversation">
          <div className="flex items-center justify-between gap-3 px-4 h-14 border-b-[3px] border-brutal-black bg-white">
            <span className="font-display font-black uppercase tracking-[-0.02em] text-lg leading-none truncate">
              <T tech="Support bot" plain="Ask Northwind" />
            </span>
            <div className="flex border-2 border-brutal-black shrink-0" role="radiogroup" aria-label="Which version answers">
              {modeBtn("quick", "First", "Quick")}
              {modeBtn("both", "Both", "Both")}
              {modeBtn("careful", "Careful", "Careful")}
            </div>
          </div>

          <div ref={thread} className="@container flex-1 min-h-0 overflow-y-auto px-4 py-5 flex flex-col gap-6">
            {turns.length === 0 && (
              <div className="m-auto w-full max-w-2xl flex flex-col gap-5 py-4">
                <div className="flex flex-col gap-2">
                  <span className="font-display font-black text-2xl md:text-3xl tracking-[-0.03em] leading-tight">
                    <T tech="Ask what a Northwind client would ask." plain="Ask what a Northwind client would ask." />
                  </span>
                  <p className="font-display text-sm md:text-base leading-relaxed opacity-75">
                    <T
                      tech="Two pipelines answer side by side: the usual first build and the careful one. Same model, same prompt. Click a number to open the exact passage it read."
                      plain="Two versions answer side by side: a quick one and a careful one. Same AI. Click a number in an answer to open the file it came from."
                    />
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={busy}
                      className="text-left px-3.5 py-3 border-[3px] border-brutal-black bg-white font-display text-sm font-bold leading-snug shadow-[3px_3px_0_0_#000] hover:bg-brutal-yellow hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow,background-color] duration-100 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {turns.map((t) => {
                const sides = (["quick", "careful"] as Side[]).filter((s) => t.slots[s]);
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="flex flex-col gap-3">
                    <p className="self-end max-w-[85%] bg-brutal-black text-cream px-4 py-2.5 font-display font-bold text-[15px] leading-snug">{t.q}</p>
                    <div className={`grid gap-3 ${sides.length === 2 ? "@lg:grid-cols-2" : ""}`}>
                      {sides.map((side) => (
                        <AnswerCard
                          key={side}
                          side={side}
                          slot={t.slots[side]!}
                          selected={selected?.turn === t.id && selected.side === side}
                          onSelect={() => {
                            setSelected({ turn: t.id, side });
                            setTab("xray");
                          }}
                          onCite={cite}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <form
            className="flex flex-col gap-2 p-3 border-t-[3px] border-brutal-black bg-white"
            onSubmit={(e) => {
              e.preventDefault();
              send(q);
            }}
          >
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                maxLength={300}
                aria-label="Your question"
                placeholder={plain ? "Ask about prices, contracts, deadlines…" : "Ask the support bot"}
                className="flex-1 min-w-0 h-11 px-3.5 border-[3px] border-brutal-black bg-cream font-display text-[15px] focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                disabled={busy || q.trim().length < 3}
                className="shrink-0 h-11 px-5 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase tracking-[-0.02em] shadow-[3px_3px_0_0_#000] hover:bg-brutal-black hover:text-brutal-yellow active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow,background-color,color] duration-100 disabled:opacity-50"
              >
                {busy ? "…" : "Ask"}
              </button>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] opacity-50 tabular-nums h-[1lh] truncate">
              {remaining != null ? `${remaining} ${plain ? "questions left this hour" : "requests left this hour"}${mode === "both" ? (plain ? " · both versions count" : " · both = 2") : ""}` : ""}
            </span>
          </form>

          <AnimatePresence>
            {sheet && (
              <motion.div
                key={sheet.type === "doc" ? `doc-${sheet.slug}-${sheet.n ?? ""}` : "prompt"}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute inset-0 z-10 flex flex-col bg-white"
              >
                <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b-[3px] border-brutal-black bg-white">
                  <button type="button" onClick={() => setSheet(null)} className={`${label} !tracking-[0.1em] h-8 px-2.5 border-2 border-brutal-black hover:bg-brutal-yellow transition-colors shrink-0`}>
                    ← <T tech="Chat" plain="Back" />
                  </button>
                  <span className="font-display font-bold text-sm md:text-base leading-tight truncate">
                    {sheet.type === "doc" ? lib?.docs.find((d) => d.slug === sheet.slug)?.title ?? sheet.slug : plain ? "Everything the AI was given" : "The exact prompt"}
                  </span>
                </div>
                <div className="flex-1 min-h-0">{sheet.type === "doc" ? <DocSheet slug={sheet.slug} highlight={sheet.highlight} n={sheet.n} /> : <PromptSheet res={sheet.res} />}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <aside className={`${pane("xray")} lg:border-l-[3px] border-brutal-black bg-white overflow-y-auto`} aria-label="X-ray">
          <Xray
            res={xrayRes}
            chapters={chapters}
            openPrompt={(r) => {
              setSheet({ type: "prompt", res: r });
              setTab("ask");
            }}
          />
        </aside>
      </div>
    </div>
  );
}

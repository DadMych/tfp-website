"use client";

import { Fragment, useEffect, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import type { Build, FTurn, Receipt } from "@/lib/privacy/forget";
import { FORGET_QUESTIONS, HALDEN_FILES } from "@/lib/privacy/questions";
import { errorText } from "@/components/lab/ai/rag-client";

type Preview = { status: 200; title: string; excerpt: string } | { status: 410; deletedAt: string } | { status: 404 };
type Entry = { kind: "turn"; q: string; t: FTurn; open?: { n: number; doc: string; p: Preview | null } } | { kind: "deleted"; r: Receipt };

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const PINK = "#FF5CAA";
const GREEN = "#C6FF3D";
const BUILDS: Build[] = ["careless", "careful"];
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Chip({ text, bg }: { text: string; bg: string }) {
  return <span className={`${label} !tracking-[0.06em] px-1.5 py-0.5 border-2 border-brutal-black`} style={{ background: bg }}>{text}</span>;
}

function History({ build, entries, deleted, onCite }: { build: Build; entries: Entry[]; deleted: boolean; onCite: (i: number, n: number) => void }) {
  const { plain } = useExplain();
  const careful = build === "careful";
  return (
    <div className="flex flex-col min-w-0">
      <div className="min-h-12 px-4 py-2 flex items-center border-b-[3px] border-brutal-black" style={{ background: careful ? GREEN : PINK }}>
        <span className={label}>
          {careful ? <T tech="Deletes the file, its pieces and cached answers" plain="Deletes it everywhere" /> : <T tech="Deletes the file from the folder" plain="Deletes it from the folder" />}
        </span>
      </div>
      <div className="h-[26rem] overflow-y-auto p-4 flex flex-col gap-4">
        {entries.length === 0 && <p className="font-mono text-[11px] opacity-50 m-auto text-center">{plain ? "The chat history shows up here." : "Chat history"}</p>}
        {entries.map((e, i) =>
          e.kind === "deleted" ? (
            <div key={i} className="bg-brutal-black text-cream px-3 py-2.5 flex flex-col gap-1 font-mono text-[11px] leading-snug">
              <span className="font-bold uppercase tracking-[0.15em] text-[10px]">{plain ? "Halden's files deleted" : "Deletion confirmed"}</span>
              <span>{plain ? `Folder: ${e.r.files} files gone` : `Harbor folder: ${e.r.files} of ${e.r.files} files deleted`}</span>
              <span style={{ color: e.r.pieces ? GREEN : PINK }}>{plain ? (e.r.pieces ? `Bot's copies: all ${e.r.pieces} deleted` : "Bot's copies: still there") : e.r.pieces ? `Search index: ${e.r.pieces} pieces deleted` : "Search index: 0 pieces deleted"}</span>
              <span style={{ color: e.r.cacheCleared ? GREEN : PINK }}>
                {e.r.cacheCleared ? (plain ? `Saved answers: ${e.r.cached} deleted` : `Answer cache: ${e.r.cached} answers deleted`) : plain ? `Saved answers: ${e.r.cached} still saved` : `Answer cache: ${e.r.cached} answers kept`}
              </span>
            </div>
          ) : (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-display font-bold text-[14px] leading-snug mr-1">{e.q}</span>
                {e.t.fromCache && <Chip text={plain ? "saved answer" : "from cache"} bg="#FFE600" />}
                {e.t.resurfaced.length > 0 && <Chip text={plain ? "from a deleted file" : "quotes a deleted file"} bg={PINK} />}
              </div>
              <p className="font-display text-[14.5px] leading-snug">
                {e.t.answer.split(/(\[\d+\])/).map((p, j) => {
                  const m = p.match(/^\[(\d+)\]$/);
                  if (!m) return <Fragment key={j}>{p}</Fragment>;
                  const n = Number(m[1]);
                  const s = e.t.sources[n - 1];
                  return (
                    <button key={j} type="button" onClick={() => onCite(i, n)} title={s?.doc} className={`font-mono text-[11px] font-bold px-1 mx-0.5 border border-brutal-black underline underline-offset-2 ${s && e.t.resurfaced.includes(s.doc) ? "bg-[#FFD1E8]" : "bg-white"} hover:bg-brutal-yellow`}>
                      {p}
                    </button>
                  );
                })}
              </p>
              {e.open && (
                <div className="border-2 border-brutal-black px-3 py-2 font-mono text-[11px] leading-relaxed" style={{ background: !e.open.p ? "#fff" : e.open.p.status === 200 ? (deleted && HALDEN_FILES.some((f) => f.doc === e.open!.doc) ? "#FFD1E8" : "#fff") : "#EEFFC2" }}>
                  {!e.open.p ? (
                    "…"
                  ) : e.open.p.status === 200 ? (
                    <>
                      <span className="font-bold block">
                        [{e.open.n}] {e.open.p.title}
                        {deleted && HALDEN_FILES.some((f) => f.doc === e.open!.doc) && <span className="ml-2">{plain ? "· still opens" : "· 200, still opens"}</span>}
                      </span>
                      {e.open.p.excerpt}…
                    </>
                  ) : e.open.p.status === 410 ? (
                    <span className="font-bold">{plain ? `This file was deleted at ${time(e.open.p.deletedAt)} at the client's request.` : `410 Gone · deleted on request at ${time(e.open.p.deletedAt)}`}</span>
                  ) : (
                    "404"
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function ForgetDemo() {
  const session = useLabSession();
  const { plain } = useExplain();
  const [q, setQ] = useState(FORGET_QUESTIONS[0].q);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [log, setLog] = useState<Record<Build, Entry[]>>({ careless: [], careful: [] });
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (session) labPost("/api/lab/privacy/forget", session, { action: "reset" }).catch(() => {});
  }, [session]);

  const call = async <R,>(body: unknown, f: (r: R) => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      f(await labPost<R>("/api/lab/privacy/forget", session, body));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const ask = () => {
    if (q.trim().length < 3) return;
    const question = q.trim();
    call<Record<Build, FTurn> & { remaining: number }>({ action: "ask", question }, (r) => {
      setRemaining(r.remaining);
      setLog((l) => ({ careless: [...l.careless, { kind: "turn", q: question, t: r.careless }], careful: [...l.careful, { kind: "turn", q: question, t: r.careful }] }));
    });
  };
  const remove = () =>
    call<Record<Build, Receipt>>({ action: "delete" }, (r) => {
      setDeleted(true);
      setLog((l) => ({ careless: [...l.careless, { kind: "deleted", r: r.careless }], careful: [...l.careful, { kind: "deleted", r: r.careful }] }));
    });
  const restart = () =>
    call({ action: "reset" }, () => {
      setDeleted(false);
      setLog({ careless: [], careful: [] });
      setQ(FORGET_QUESTIONS[0].q);
    });
  const cite = (build: Build) => async (i: number, n: number) => {
    const e = log[build][i];
    if (e.kind !== "turn") return;
    const doc = e.t.sources[n - 1]?.doc;
    if (!doc) return;
    const set = (p: Preview | null) => setLog((l) => ({ ...l, [build]: l[build].map((x, k) => (k === i && x.kind === "turn" ? { ...x, open: { n, doc, p } } : x)) }));
    set(null);
    try {
      set(await labPost<Preview>("/api/lab/privacy/forget", session, { action: "open", build, doc }));
    } catch (err) {
      setError(errorText(err));
    }
  };

  const asked = log.careless.some((e) => e.kind === "turn");
  const step = !asked ? 1 : !deleted ? 2 : 3;
  const hint = [
    plain ? "First ask while Halden's files still exist." : "Ask while the files exist. Both bots answer from them.",
    plain ? "Now delete Halden's files, as Sofie confirmed she would." : "Now delete them, as Sofie confirmed in writing.",
    plain ? "Ask the same question again, then ask it in other words. Click a [1] in the old answers too." : "Ask the same question again (the cache), then in other words (the index). Click an old citation.",
  ][step - 1];

  return (
    <div className="flex flex-col gap-5">
      <Stage className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5">
        <div className="flex flex-col gap-3 min-w-0">
          <span className={label}>Harbor · Halden Health · Design System Audit 2026</span>
          <ul className="border-[3px] border-brutal-black bg-white">
            {HALDEN_FILES.map((f) => (
              <li key={f.doc} className="h-11 px-3 flex items-center gap-2.5 border-b-2 border-brutal-black/15 min-w-0">
                <span className={`font-display text-[14px] truncate flex-1 ${deleted ? "line-through opacity-40" : ""}`}>{f.name}</span>
                {deleted && <Chip text="deleted" bg="#000" />}
              </li>
            ))}
            <li className="h-11 px-3 flex items-center gap-2.5 bg-cream min-w-0">
              <span className="font-display text-[14px] truncate flex-1">Email: delete our files</span>
              <span className={`${label} !tracking-[0.06em] opacity-60 shrink-0`}>{plain ? "kept as proof" : "kept · the record"}</span>
            </li>
          </ul>
          <div className="flex items-center gap-3">
            <button type="button" onClick={remove} disabled={busy || deleted || !asked} className="h-12 px-4 border-[3px] border-brutal-black bg-brutal-black text-cream font-display font-black uppercase shadow-[4px_4px_0_0_#FF5CAA] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40">
              {deleted ? "Deleted" : "Delete Halden's files"}
            </button>
            {(asked || deleted) && (
              <button type="button" onClick={restart} disabled={busy} className="font-mono text-[11px] font-bold underline underline-offset-4 disabled:opacity-40">
                {plain ? "Start over" : "Reset"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <span className={label}>
            <span className="inline-block px-1.5 mr-2 bg-brutal-black text-cream">{step}/3</span>
            {hint}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FORGET_QUESTIONS.flatMap((x) => [x.q, x.again]).map((x) => (
              <button key={x} type="button" onClick={() => setQ(x)} aria-pressed={q === x} className={`text-left min-h-11 px-3 py-2 border-[3px] border-brutal-black font-display text-[14px] leading-snug ${q === x ? "bg-brutal-yellow" : "bg-white hover:bg-cream"}`}>
                {x}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={FORGET_QUESTIONS.some((x) => x.q === q || x.again === q) ? "" : q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              maxLength={300}
              aria-label="Question"
              placeholder={plain ? "Or type your own question" : "Or ask your own"}
              className="flex-1 min-w-0 h-12 px-3 border-[3px] border-brutal-black bg-cream font-display text-[15px] focus:outline-none focus:bg-white"
            />
            <button type="button" onClick={ask} disabled={busy} className="h-12 px-5 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
              {busy ? "…" : "Ask"}
            </button>
          </div>
          <span className={`${label} opacity-60`}>{error ? <span className="text-[#D4006A] normal-case tracking-normal">{error}</span> : remaining != null ? `${remaining} ${plain ? "tries left this hour" : "AI questions left this hour"}` : "\u00a0"}</span>
        </div>
      </Stage>

      <div className="border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] grid grid-cols-1 lg:grid-cols-2">
        {BUILDS.map((b, i) => (
          <div key={b} className={`min-w-0 ${i === 0 ? "border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black" : ""}`}>
            <History build={b} entries={log[b]} deleted={deleted} onCite={cite(b)} />
          </div>
        ))}
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="Real: the 140 files, the search, the model and the answer cache. The deletion is yours alone: it marks Halden's three files deleted for this browser, and nobody else's bot loses them. It resets when you reload."
          plain="Real: the files, the search and the AI. The deletion only happens for you, so other visitors still see Halden's files. Reload the page to start again."
        />
      </p>
    </div>
  );
}

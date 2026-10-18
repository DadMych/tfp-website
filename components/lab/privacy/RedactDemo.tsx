"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost } from "@/lib/lab/client";
import { BRIEF, FIELDS, PATIENTS, TASKS, message } from "@/lib/privacy/brief";
import { DETAILS, redact, type Segment } from "@/lib/privacy/redact";
import type { Build, Side } from "@/lib/privacy/leaves";
import { errorText } from "@/components/lab/ai/rag-client";

type Result = Record<Build, Side> & { task: string };

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const PINK = "#FF5CAA";
const GREEN = "#C6FF3D";
const BUILDS: Build[] = ["careless", "careful"];
const HEADERS = ["Patient", "Date of birth", "Record no.", "Phone", "Email", "Reason for visit"];
const SPLIT_PH = /(\[[A-Z]+_\d+\])/;

/** Lab patients' details in pink, placeholders in green. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(DETAILS).map((p, i) =>
        i % 2 ? (
          <mark key={i} data-hit className="text-inherit px-0.5" style={{ background: "#FFD1E8" }}>
            {p}
          </mark>
        ) : (
          <Fragment key={i}>
            {p.split(SPLIT_PH).map((q, j) =>
              j % 2 ? (
                <span key={j} data-hit className="bg-[#EEFFC2] border border-brutal-black/30 px-0.5">
                  {q}
                </span>
              ) : (
                q
              )
            )}
          </Fragment>
        )
      )}
    </>
  );
}

function Shown({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.ph ? (
          <span key={i} title={s.ph} className="underline decoration-2 decoration-[#7FB800] underline-offset-2">
            {s.t}
          </span>
        ) : (
          <Fragment key={i}>{s.t}</Fragment>
        )
      )}
    </>
  );
}

function Column({ build, preview, side }: { build: Build; preview: { sent: string; swapped: number; count: number }; side: Side | null }) {
  const { plain } = useExplain();
  const careful = build === "careful";
  const sent = side?.sent ?? preview.sent;
  const count = side ? side.exposed.length : preview.count;
  const swapped = side?.swapped ?? preview.swapped;
  const box = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const hit = box.current?.querySelector<HTMLElement>("[data-hit]");
      if (box.current && hit) box.current.scrollTop = hit.offsetTop - 24;
    });
    return () => cancelAnimationFrame(id);
  }, [sent]);
  return (
    <div className="flex flex-col min-w-0">
      <div className="min-h-12 px-4 py-2 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black" style={{ background: careful ? GREEN : PINK }}>
        <span className={label}>{careful ? <T tech="Swaps personal details out first" plain="Hides personal details first" /> : <T tech="Sends the brief as it is" plain="Sends everything" />}</span>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className={label}>{side ? (plain ? "What the AI got" : "What left for the AI") : plain ? "What the AI will get" : "What will leave for the AI"}</span>
            <span className="font-mono text-[11px] font-bold" style={{ color: count ? "#D4006A" : "#3D7A00" }}>
              {plain ? `${count} patient details` : `${count} of ${PATIENTS.length * FIELDS.length} patient details`}
              {careful && ` · ${swapped} ${plain ? "hidden" : "swapped"}`}
            </span>
          </div>
          <pre ref={box} className="relative h-56 overflow-auto border-2 border-brutal-black bg-cream p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
            <Marked text={sent} />
          </pre>
          {side && (
            <details className="font-mono text-[11px]">
              <summary className="cursor-pointer opacity-60">{plain ? "And the instructions" : "+ system prompt"}</summary>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed opacity-80">{side.system}</p>
            </details>
          )}
        </div>
        {side ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className={label}>{plain ? "What the AI wrote" : "What came back"}</span>
              <p className="font-display text-[14.5px] leading-snug whitespace-pre-wrap">
                <Marked text={side.reply} />
              </p>
            </div>
            <div className="flex flex-col gap-1.5 border-t-2 border-brutal-black/15 pt-3">
              <span className={label}>{plain ? "What you see" : "What the reader sees"}</span>
              {careful ? (
                <>
                  <p className="font-display text-[14.5px] leading-snug whitespace-pre-wrap">
                    <Shown segments={side.shown} />
                  </p>
                  <span className="font-mono text-[11px] opacity-60">
                    {side.unresolved.length
                      ? `${side.unresolved.join(" ")}: ${plain ? "made up by the AI, left as it is" : "not in the map, left as written"}`
                      : plain
                        ? "Underlined: put back on our side, after the answer came back."
                        : "Underlined: real values put back from the map on our server. The model never had them."}
                  </span>
                </>
              ) : (
                <span className="font-mono text-[11px] opacity-60">{plain ? "The same text. There was nothing to put back." : "The same text. Nothing was swapped, so nothing to put back."}</span>
              )}
            </div>
          </>
        ) : (
          <p className="font-mono text-[11px] opacity-50">{plain ? "Press Ask to see the answer." : "Ask to see what comes back."}</p>
        )}
      </div>
    </div>
  );
}

export default function RedactDemo() {
  const { plain } = useExplain();
  const [q, setQ] = useState(TASKS[1].q);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const task = q.trim().replace(/\s+/g, " ");
  const preview = useMemo(() => {
    const { parts, swaps } = redact([BRIEF, task]);
    const all = PATIENTS.length * FIELDS.length;
    return {
      careless: { sent: message(BRIEF, task), swapped: 0, count: all },
      careful: { sent: message(parts[0], parts[1]), swapped: swaps.length, count: 0 },
    };
  }, [task]);
  const current = result && result.task === task ? result : null;

  const ask = async () => {
    if (busy || task.length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const r = await labPost<Record<Build, Side> & { remaining: number }>("/api/lab/privacy/redact", null, { task });
      setRemaining(r.remaining);
      setResult({ ...r, task });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const cut = BRIEF.indexOf("\n\n");
  const [head, rest] = [BRIEF.slice(0, cut), BRIEF.slice(cut + 2)];
  const [before, after] = [rest.slice(0, rest.indexOf("| Patient")), rest.slice(rest.lastIndexOf("|") + 1)];

  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 min-w-0">
          <span className={label}>{plain ? "The client's email" : "Halden's brief, as it arrived"}</span>
          <div className="border-[3px] border-brutal-black bg-white">
            <pre className="px-4 py-3 border-b-2 border-brutal-black/15 font-mono text-[11px] leading-relaxed whitespace-pre-wrap opacity-70">{head}</pre>
            <div className="px-4 py-3 flex flex-col gap-3">
              <p className="font-display text-[14px] leading-snug whitespace-pre-wrap max-w-3xl">{before.trim()}</p>
              <div className="border-2 border-brutal-black overflow-x-auto">
                <div className={`${label} !tracking-[0.08em] px-2 py-1 bg-brutal-black text-cream`}>{plain ? "Made-up patients, for this lab only" : "Test data: every patient here is made up, lab only"}</div>
                <table className="w-full min-w-[40rem] font-mono text-[11px]">
                  <thead>
                    <tr className="bg-cream">
                      {HEADERS.map((h) => (
                        <th key={h} className="text-left font-bold px-2 py-1.5 border-b-2 border-brutal-black">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PATIENTS.map((p) => (
                      <tr key={p.record} className="border-b border-brutal-black/15 last:border-b-0">
                        {FIELDS.map((f) => (
                          <td key={f} className="px-2 py-1.5 whitespace-nowrap">
                            {p[f]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="font-display text-[14px] leading-snug whitespace-pre-wrap max-w-3xl">{after.trim()}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <span className={label}>{plain ? "Ask the AI to help with it" : "Pick a task for the AI"}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TASKS.map((t) => (
              <button key={t.id} type="button" onClick={() => setQ(t.q)} aria-pressed={q === t.q} className={`text-left min-h-11 px-3 py-2 border-[3px] border-brutal-black font-display text-[14px] leading-snug ${q === t.q ? "bg-brutal-yellow" : "bg-white hover:bg-cream"}`}>
                {t.q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={TASKS.some((t) => t.q === q) ? "" : q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              maxLength={300}
              aria-label="Task"
              placeholder={plain ? "Or type your own, like “What's Marta's phone?”" : "Or your own: try “What's Marta's phone?”"}
              className="flex-1 min-w-0 h-12 px-3 border-[3px] border-brutal-black bg-cream font-display text-[15px] focus:outline-none focus:bg-white"
            />
            <button type="button" onClick={ask} disabled={busy} className="h-12 px-5 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
              {busy ? "…" : "Ask"}
            </button>
          </div>
          <span className={`${label} opacity-60`}>{error ? <span className="text-[#D4006A] normal-case tracking-normal">{error}</span> : remaining != null ? `${remaining} ${plain ? "tries left this hour" : "AI questions left this hour"}` : "\u00a0"}</span>
          <p className="font-mono text-[11px] leading-relaxed opacity-70 mt-1">
            <T
              tech="Below, before you ask: the exact message each build would send, worked out in your browser as you type. After you ask, it's the one the server really sent."
              plain="Below you can already see what each version would send. Type your own question and watch it change."
            />
          </p>
        </div>
      </Stage>

      <div className="border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] grid grid-cols-1 lg:grid-cols-2">
        {BUILDS.map((b, i) => (
          <div key={b} className={`min-w-0 ${i === 0 ? "border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black" : ""}`}>
            <Column build={b} preview={preview[b]} side={current?.[b] ?? null} />
          </div>
        ))}
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="Real: the model call, both prompts and the swap. The careless build really sends these made-up patients to the model provider. Halden's brief and its patients exist only on this page; they are not in the bot's 140 files. Pink: a patient detail. Green: a placeholder."
          plain="Real: the AI and what gets sent to it. The patients are made up and only exist on this page. Pink is a patient detail, green is a stand-in."
        />
      </p>
    </div>
  );
}

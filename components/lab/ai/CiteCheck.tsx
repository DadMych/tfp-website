"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labGet, useLabSession } from "@/lib/lab/client";
import { checkCitations, DECLINE, tally, type Claim, type ClaimStatus } from "@/lib/rag/cite";
import { CAREFUL, QUICK } from "@/lib/rag/presets";
import { type AskResult, ask, errorText, section } from "./rag-client";

const STARTERS = [
  "What does the Partner plan include and cost?",
  "How does the rush fee work on a retainer?",
  "On a Brand Sprint, what does a third revision round cost if it's rushed?",
  "Was the Studio plan going to cost €6,200 in 2026?",
  "Is the studio open on 14 May 2026?",
  "Can we pay by credit card?",
];

const STATUS: Record<ClaimStatus, { tech: string; plain: string; bg: string }> = {
  backed: { tech: "In the cited source", plain: "Checks out", bg: "#C6FF3D" },
  elsewhere: { tech: "Wrong source cited", plain: "Wrong source", bg: "#FFE600" },
  nowhere: { tech: "In no source", plain: "Not in the files", bg: "#FF5CAA" },
  uncited: { tech: "No citation", plain: "No source given", bg: "#FFB38A" },
  plain: { tech: "Nothing to check", plain: "No number to check", bg: "#FFFFFF" },
};

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "€5,800" also matches "5.800" and "5800" in a source. */
function pattern(values: string[]) {
  const alts = values.flatMap((v) => {
    const bare = v.replace(/^€\s?/, "");
    const digits = bare.replace(/(\d)[.,](?=\d{3}\b)/g, "$1");
    return [v, bare, digits, digits.replace(/(\d)(?=(\d{3})+\b)/g, "$1,"), digits.replace(/(\d)(?=(\d{3})+\b)/g, "$1.")];
  });
  const uniq = [...new Set(alts.filter((a) => a.length > 1))].sort((a, b) => b.length - a.length);
  return uniq.length ? new RegExp(`(${uniq.map(esc).join("|")})`, "gi") : null;
}

function Marked({ text, re, strong }: { text: string; re: RegExp | null; strong: boolean }) {
  if (!re) return <>{text}</>;
  return (
    <>
      {text.split(re).map((p, i) =>
        i % 2 ? (
          <mark key={i} className={`px-0.5 ${strong ? "bg-brutal-black text-[#C6FF3D]" : "bg-brutal-yellow"}`}>
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

export default function CiteCheck() {
  const session = useLabSession();
  const { plain } = useExplain();
  const [careful, setCareful] = useState(true);
  const [q, setQ] = useState(STARTERS[2]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    labGet<{ remaining: number }>("/api/lab/ai/rag/ask", session).then(
      (r) => setRemaining(r.remaining),
      () => {}
    );
  }, [session]);

  const run = async (question = q) => {
    if (busy || question.trim().length < 3) return;
    setQ(question);
    setBusy(true);
    setError(null);
    setPick(null);
    try {
      const r = await ask(session, question, careful ? CAREFUL : QUICK);
      setRes(r);
      setRemaining(r.remaining);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const claims = useMemo<Claim[]>(() => (res ? checkCitations(res.answer, res.hits) : []), [res]);
  const t = tally(claims);
  const declined = res != null && DECLINE.test(res.answer.trim());
  const chosen = pick == null ? null : claims[pick];
  const values = (chosen ? chosen.facts : claims.flatMap((c) => c.facts)).map((f) => f.value);
  const re = pattern(values);

  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form
            className="flex flex-1 min-w-0 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} aria-label="Question" className="flex-1 min-w-0 h-12 px-3.5 border-[3px] border-brutal-black bg-cream font-display text-base focus:outline-none focus:bg-white" />
            <button type="submit" disabled={busy} className="shrink-0 h-12 px-5 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
              {busy ? "…" : plain ? "Ask" : "Ask"}
            </button>
          </form>
          <div className="flex border-[3px] border-brutal-black h-12 shrink-0" role="group" aria-label="Build">
            {[false, true].map((c) => (
              <button key={String(c)} type="button" onClick={() => setCareful(c)} aria-pressed={careful === c} className={`px-3 font-display font-bold text-sm ${c ? "border-l-[3px] border-brutal-black" : ""} ${careful === c ? (c ? "bg-[#C6FF3D]" : "bg-[#FF5CAA]") : "bg-white hover:bg-cream"}`}>
                {c ? (plain ? "Careful" : "Careful build") : plain ? "Quick" : "First build"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STARTERS.map((s) => (
            <button key={s} type="button" onClick={() => run(s)} disabled={busy} className="shrink-0 max-w-[18rem] truncate h-9 px-3 border-2 border-dashed border-brutal-black bg-white hover:bg-brutal-yellow hover:border-solid font-display text-[13px] disabled:opacity-60">
              {s}
            </button>
          ))}
        </div>
        <span className={`${label} opacity-50`}>{remaining != null ? `${remaining} ${plain ? "questions left this hour" : "requests left this hour"}` : "\u00a0"}</span>
      </Stage>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
        {/* Claims */}
        <div className="flex flex-col h-[32rem] min-w-0 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black">
          <div className="shrink-0 px-4 h-12 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black bg-cream">
            <span className={label}>
              <T tech="The answer, sentence by sentence" plain="The answer, checked" />
            </span>
            {res && !declined && (
              <span className="font-mono text-[11px] tabular-nums whitespace-nowrap">
                <b>{t.backed}</b>/{t.facts} {plain ? "check out" : "in cited source"}
              </span>
            )}
          </div>
          <div className={`flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 transition-opacity ${busy && res ? "opacity-40" : ""}`}>
            {error && <p className="font-display font-bold text-[#D4006A] p-2">{error}</p>}
            {!res && !error && (
              <p className="m-auto max-w-sm text-center font-display text-base leading-snug opacity-70" aria-live="polite">
                {busy ? (plain ? "Reading the files…" : "Searching and answering…") : <T tech="Ask something. Every number, date and code in the answer is checked against the source it cites, by code, as soon as it arrives." plain="Ask a question. Every number in the answer gets checked against the file it points to." />}
              </p>
            )}
            {res && declined && (
              <div className="m-auto max-w-sm text-center flex flex-col gap-3 items-center">
                <span className="font-display font-black uppercase text-2xl -rotate-1 border-[3px] border-brutal-black bg-white px-3 py-1 shadow-[4px_4px_0_0_#000]">{plain ? "It said no" : "Declined"}</span>
                <p className="font-display text-base leading-snug">&ldquo;{res.answer}&rdquo;</p>
                <p className="font-mono text-[11px] opacity-60">
                  <T tech="Nothing to check. That's the right result when the files don't say; the test set has six questions like this." plain="Nothing to check. If the files really don't say, that's the right answer." />
                </p>
              </div>
            )}
            {res &&
              !declined &&
              claims.map((c, i) => {
                const s = STATUS[c.status];
                const on = pick === i;
                return (
                  <button key={i} type="button" onClick={() => setPick(on ? null : i)} aria-pressed={on} className={`text-left border-2 border-brutal-black bg-white flex flex-col transition-shadow ${on ? "shadow-[4px_4px_0_0_#000] outline outline-2 outline-brutal-black" : "hover:bg-cream"}`}>
                    <span className="flex items-center justify-between gap-2 px-2.5 h-7 border-b-2 border-brutal-black/15">
                      <span className={`${label} !tracking-[0.08em] px-1.5 border border-brutal-black`} style={{ background: s.bg }}>
                        {plain ? s.plain : s.tech}
                      </span>
                      <span className="font-mono text-[10px] font-bold">{c.cites.map((n) => `[${n}]`).join(" ")}</span>
                    </span>
                    <span className="px-2.5 py-2 font-display text-[14px] leading-snug">{c.text}</span>
                    {c.facts.length > 0 && (
                      <span className="flex flex-wrap gap-1 px-2.5 pb-2">
                        {c.facts.map((f) => (
                          <span key={f.value} className={`font-mono text-[10.5px] px-1.5 py-0.5 border border-brutal-black ${f.inCited.length ? "bg-[#C6FF3D]" : f.inOther.length ? "bg-brutal-yellow" : "bg-[#FF5CAA]"}`}>
                            {f.value}
                            <span className="opacity-60">{f.inCited.length ? ` · [${f.inCited.join("][")}]` : f.inOther.length ? ` · ${plain ? "really in" : "found in"} [${f.inOther.join("][")}]` : ` · ${plain ? "nowhere" : "no source"}`}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Sources */}
        <div className="flex flex-col h-[32rem] min-w-0">
          <div className="shrink-0 px-4 h-12 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black bg-cream">
            <span className={label}>
              <T tech="The five sources it was given" plain="The five files it read" />
            </span>
            <span className={`${label} opacity-50`}>{chosen ? (plain ? "for this sentence" : "showing one sentence") : "\u00a0"}</span>
          </div>
          <ol className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 bg-cream">
            {res?.hits.map((h) => {
              const cited = chosen ? chosen.cites.includes(h.n) : claims.some((c) => c.cites.includes(h.n));
              return (
                <li key={h.n} className={`border-2 border-brutal-black bg-white ${chosen && cited ? "outline outline-[3px] outline-brutal-black shadow-[4px_4px_0_0_#000]" : ""} ${chosen && !cited ? "opacity-55" : ""}`}>
                  <div className="flex items-start gap-2 px-2.5 py-1.5 bg-brutal-black text-cream">
                    <span className="shrink-0 font-mono text-[11px] font-bold">[{h.n}]</span>
                    <span className="font-mono text-[10.5px] leading-snug">
                      {h.title}
                      {section(h.heading) ? ` › ${section(h.heading)}` : ""} · {h.updated}
                      {h.status === "archived" ? " · ARCHIVED" : ""}
                    </span>
                  </div>
                  <p className="px-2.5 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words max-h-[12rem] overflow-y-auto">
                    <Marked text={h.text} re={re} strong={Boolean(chosen && cited)} />
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="The check only looks at things it can match exactly: amounts, percentages, codes, dates, times, numbers of two or more digits. A sentence without one passes unchecked. A number found in no source isn't always invented: sometimes the model did the arithmetic."
          plain="It can only check numbers, dates and codes. A sentence without one isn't checked. A number that's in no file isn't always made up: sometimes the AI did the maths."
        />
      </p>
    </div>
  );
}

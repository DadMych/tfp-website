"use client";

import { Fragment, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import { BUILD_LABEL, FIELD_LABEL, GRADE_BG, show, type ThreadView } from "./extract-meta";
import { errorText } from "./rag-client";

interface BuildOut {
  build: string;
  record: Record<string, unknown>;
  error: string | null;
  grades: Record<string, string> | null;
  proofs: Record<string, string> | null;
  quotes: Record<string, string | null> | null;
}
interface Result {
  builds: BuildOut[];
  remaining: number;
}

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const OWN = "own";
const PROOF: Record<string, { tech: string; plain: string; ok: boolean }> = {
  verified: { tech: "quote checks out", plain: "proof checks out", ok: true },
  null: { tech: "null, nothing to quote", plain: "left empty", ok: true },
  "no-quote": { tech: "no quote: check by hand", plain: "no proof: a person checks", ok: false },
  "not-in-thread": { tech: "quote not in the thread: check by hand", plain: "proof isn't in the email: a person checks", ok: false },
  "value-not-in-quote": { tech: "quote doesn't contain the value: check by hand", plain: "proof doesn't show it: a person checks", ok: false },
};

/** Whitespace and markdown in the thread don't match the quote character for character; match loosely. */
function Thread({ body, quote }: { body: string; quote: string | null }) {
  const words = quote?.replace(/\*\*/g, "").trim().split(/\s+/).filter(Boolean) ?? [];
  const re = words.length ? new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s*]+")})`, "i") : null;
  const parts = re ? body.split(re) : [body];
  return (
    <p className="font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="bg-brutal-yellow px-0.5 outline outline-2 outline-brutal-black" ref={(el) => {
              const box = el?.closest<HTMLElement>("[data-scroll]");
              if (el && box) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2, behavior: "smooth" });
            }}>
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </p>
  );
}

export default function ExtractLab({ threads, fields, keys }: { threads: ThreadView[]; fields: string[]; keys: Record<string, Record<string, string>> }) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [pick, setPick] = useState(threads[0].slug);
  const [own, setOwn] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const thread = threads.find((t) => t.slug === pick);
  const key = thread ? keys[thread.slug] : null;
  const evidence = res?.builds.find((b) => b.build === "evidence");

  const choose = (slug: string) => {
    setPick(slug);
    setRes(null);
    setError(null);
    setFocus(null);
  };
  const run = async () => {
    if (busy || (!thread && own.trim().length < 40)) return;
    setBusy(true);
    setError(null);
    setFocus(null);
    try {
      setRes(await labPost<Result>("/api/lab/ai/extract", session, thread ? { slug: thread.slug } : { text: own }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const proofOf = (f: string) => evidence?.proofs?.[f];
  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Email thread">
          {[...threads.map((t) => ({ id: t.slug, text: t.title })), { id: OWN, text: plain ? "Paste your own" : "Your own thread" }].map((t) => (
            <button key={t.id} type="button" onClick={() => choose(t.id)} aria-pressed={pick === t.id} className={`shrink-0 max-w-[16rem] truncate h-9 px-3 border-2 border-brutal-black font-display text-[13px] ${pick === t.id ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}>
              {t.text}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={run} disabled={busy} className="shrink-0 h-12 px-6 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
            {busy ? "…" : plain ? "Fill the record" : "Run all three"}
          </button>
          <span className={`${label} opacity-50 truncate`}>{error ? <span className="text-[#D4006A] normal-case tracking-normal font-display text-sm">{error}</span> : res ? `${res.remaining} ${plain ? "tries left this hour" : "runs left this hour"}` : plain ? "Three ways of asking, same email" : "Three builds, same thread, same model"}</span>
        </div>
      </Stage>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
        <div className="flex flex-col h-[22rem] lg:h-[34rem] min-w-0 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black">
          <div className="shrink-0 h-12 px-4 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black bg-cream">
            <span className={label}>
              <T tech="The thread" plain="The email" />
            </span>
            <span className={`${label} opacity-50`}>{focus ? (plain ? "the proof it gave" : `quote for ${focus}`) : "\u00a0"}</span>
          </div>
          <div data-scroll className="relative flex-1 min-h-0 overflow-y-auto p-4">
            {thread ? (
              <Thread body={thread.body} quote={focus ? (evidence?.quotes?.[focus] ?? null) : null} />
            ) : (
              <textarea value={own} onChange={(e) => setOwn(e.target.value)} maxLength={4000} aria-label="Email thread" placeholder={plain ? "Paste an email conversation. Remove anything private first." : "40–4,000 characters. Not stored. Remove anything private first."} className="w-full h-full resize-none font-mono text-[11.5px] leading-relaxed focus:outline-none" />
            )}
          </div>
        </div>

        <div className="flex flex-col h-[34rem] min-w-0">
          <div className="shrink-0 h-12 px-4 flex items-center border-b-[3px] border-brutal-black bg-cream">
            <span className={label}>
              <T tech="The CRM record, three ways" plain="What each version filled in" />
            </span>
          </div>
          <div className={`flex-1 min-h-0 overflow-auto transition-opacity ${busy && res ? "opacity-40" : ""}`}>
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b-[3px] border-brutal-black">
                  <th className={`${label} px-3 h-12 w-[8.5rem]`}>{plain ? "Field" : "field"}</th>
                  {["prose", "schema", "evidence"].map((b) => (
                    <th key={b} className="font-display font-bold text-[12.5px] leading-tight px-2 h-12">
                      {plain ? BUILD_LABEL[b].plain : BUILD_LABEL[b].tech}
                    </th>
                  ))}
                  {key && <th className={`${label} px-2 h-12 bg-cream w-[8rem]`}>{plain ? "Right answer" : "key"}</th>}
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f} className="border-b-2 border-brutal-black/15">
                    <th className={`px-3 h-[3.25rem] ${plain ? "font-display text-[13px] font-bold" : "font-mono text-[11px] font-bold"}`}>{plain ? FIELD_LABEL[f].plain : FIELD_LABEL[f].tech}</th>
                    {["prose", "schema", "evidence"].map((b) => {
                      const out = res?.builds.find((x) => x.build === b);
                      const g = out?.grades?.[f];
                      const p = b === "evidence" ? proofOf(f) : undefined;
                      const v = out ? show(out.record[f]) : "\u00a0";
                      const body = (
                        <span className="flex flex-col justify-center gap-0.5 h-10 px-2 border-2 border-brutal-black" style={{ background: g ? GRADE_BG[g] : "#fff" }}>
                          <span className="font-mono text-[11px] leading-tight truncate" title={v}>
                            {v}
                          </span>
                          {p && <span className={`font-mono text-[9.5px] leading-none truncate ${PROOF[p]?.ok ? "opacity-60" : "font-bold"}`}>{PROOF[p]?.ok ? "✓ " : "⚑ "}{plain ? PROOF[p]?.plain : PROOF[p]?.tech}</span>}
                        </span>
                      );
                      return (
                        <td key={b} className="p-1 max-w-0">
                          {b === "evidence" && evidence?.quotes?.[f] && thread ? (
                            <button type="button" onClick={() => setFocus(focus === f ? null : f)} aria-pressed={focus === f} className={`w-full text-left ${focus === f ? "outline outline-[3px] outline-brutal-black" : ""}`}>
                              {body}
                            </button>
                          ) : (
                            body
                          )}
                        </td>
                      );
                    })}
                    {key && (
                      <td className="p-1 max-w-0 bg-cream">
                        <span className="block font-mono text-[11px] px-2 truncate" title={key[f]}>
                          {key[f]}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="Green: matches the key. Yellow: right value in a shape an import would reject. Pink: wrong. ⚑ means the quote check failed and a person should look. Click a value in the last column to see its quote in the thread."
          plain="Green is right, pink is wrong, yellow is right but written in a way the CRM won't accept. A flag means the proof didn't check out, so a person should look. Click an answer in the last column to see the proof."
        />
      </p>
    </div>
  );
}

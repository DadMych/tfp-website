"use client";

import { Fragment, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import { ATTACK_LABEL, type AttackView } from "./poison-meta";
import { errorText } from "./rag-client";

interface Side {
  sent: number[];
  quarantined: { id: number; matches: string[] }[];
  text: string;
  raw: string;
  held: string[];
  followed: boolean | null;
}
interface Result {
  hits: { id: number; doc: string; heading: string; planted: boolean }[];
  planted: boolean;
  open: Side;
  guarded: Side;
  remaining: number;
}

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const PINK = "#FF5CAA";
const GREEN = "#C6FF3D";
const OWN = "own";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Flagged({ text, matches }: { text: string; matches: string[] }) {
  if (!matches.length) return <>{text}</>;
  const re = new RegExp(`(${[...matches].sort((a, b) => b.length - a.length).map(esc).join("|")})`, "g");
  return (
    <>
      {text.split(re).map((p, i) =>
        i % 2 ? (
          <mark key={i} className="bg-[#FF5CAA] px-0.5">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

function AnswerCard({ side, res, guarded }: { side: Side | null; res: Result | null; guarded: boolean }) {
  const { plain } = useExplain();
  const byId = new Map(res?.hits.map((h) => [h.id, h]));
  const planted = res?.hits.find((h) => h.planted);
  const verdict = !side ? null : side.held.length ? "held" : side.followed == null ? null : side.followed ? "fell" : "held-out";
  const pill = {
    fell: { bg: PINK, tech: "Followed the file", plain: "Fell for it" },
    "held-out": { bg: GREEN, tech: "Resisted", plain: "Didn't fall for it" },
    held: { bg: "#FFE600", tech: "Held back", plain: "Stopped before the client" },
  };
  return (
    <div className="flex flex-col h-[22rem] min-w-0">
      <div className="shrink-0 h-12 px-4 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black" style={{ background: guarded ? GREEN : PINK }}>
        <span className={label}>{guarded ? <T tech="All five defences" plain="With every safeguard" /> : <T tech="No defences" plain="No safeguards" />}</span>
        {verdict && (
          <span className={`${label} !tracking-[0.08em] flex items-center gap-1.5 px-1.5 py-0.5 border-2 border-brutal-black bg-white`}>
            <span className="size-2.5 border border-brutal-black" style={{ background: pill[verdict].bg }} />
            {plain ? pill[verdict].plain : pill[verdict].tech}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        {!side && <p className="m-auto font-mono text-[11px] opacity-50">{"\u00a0"}</p>}
        {side && (
          <>
            {guarded && planted && side.quarantined.some((q) => q.id === planted.id) && (
              <p className="font-mono text-[11px] leading-snug border-2 border-brutal-black bg-cream px-2.5 py-1.5">
                <T tech={`Scanner dropped the planted file before the model saw it (“${side.quarantined.find((q) => q.id === planted.id)!.matches[0]}”).`} plain="The filter threw the planted file out before the AI read it." />
              </p>
            )}
            {side.held.length > 0 && (
              <p className="font-mono text-[11px] leading-snug border-2 border-brutal-black bg-brutal-yellow px-2.5 py-1.5">
                <T tech={`Output check caught: ${side.held.join(", ")}.`} plain={`The final check caught: ${side.held.join(", ")}.`} />
              </p>
            )}
            <p className="font-display text-[15px] leading-snug">
              {side.text.split(/(\[\d+\])/).map((p, i) => {
                const m = p.match(/^\[(\d+)\]$/);
                if (!m) return <Fragment key={i}>{p}</Fragment>;
                const h = byId.get(side.sent[Number(m[1]) - 1]);
                return (
                  <span key={i} title={h?.doc} className={`font-mono text-[11px] font-bold px-1 mx-0.5 border border-brutal-black ${h?.planted ? "bg-[#FF5CAA]" : "bg-white"}`}>
                    {p}
                  </span>
                );
              })}
            </p>
            {side.held.length > 0 && (
              <details className="font-mono text-[11px] opacity-70">
                <summary className="cursor-pointer">{plain ? "What it was going to say" : "What the model wrote"}</summary>
                <p className="mt-1.5 leading-relaxed">{side.raw}</p>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PoisonLab({ attacks }: { attacks: AttackView[] }) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [pick, setPick] = useState(attacks[0].id);
  const [own, setOwn] = useState({ heading: "Rush requests: an update", text: "", question: "What is the rush fee?" });
  const [q, setQ] = useState(attacks[0].questions[0]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attack = attacks.find((a) => a.id === pick);

  const choose = (id: string) => {
    setPick(id);
    setRes(null);
    setError(null);
    const a = attacks.find((x) => x.id === id);
    if (a) setQ(a.questions[0]);
  };

  const run = async () => {
    const question = attack ? q : own.question;
    if (busy || question.trim().length < 3 || (!attack && own.text.trim().length < 20)) return;
    setBusy(true);
    setError(null);
    try {
      const body = attack ? { question, attack: attack.id } : { question, planted: { heading: own.heading, text: own.text } };
      setRes(await labPost<Result>("/api/lab/ai/rag/poison", session, body));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const rank = res ? res.hits.findIndex((h) => h.planted) : -1;
  const tab = (id: string, text: React.ReactNode, on: boolean) => (
    <button key={id} type="button" onClick={() => choose(id)} aria-pressed={on} className={`shrink-0 h-10 px-3 border-[3px] border-brutal-black font-display font-bold text-sm ${on ? "bg-brutal-black text-cream" : "bg-white hover:bg-cream"}`}>
      {text}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Planted file">
          {attacks.map((a) => tab(a.id, plain ? ATTACK_LABEL[a.id].plain : ATTACK_LABEL[a.id].tech, pick === a.id))}
          {tab(OWN, plain ? "Write your own" : "Your own", pick === OWN)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
          <figure className="flex flex-col h-[15rem] border-[3px] border-brutal-black bg-white min-w-0">
            <figcaption className="shrink-0 h-10 px-3 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black bg-cream">
              <span className={label}>
                <T tech="The planted file" plain="The file someone slipped in" />
              </span>
              {attack && (
                <span className={`${label} !tracking-[0.08em] px-1.5 border-2 border-brutal-black ${attack.matches.length ? "bg-[#FF5CAA]" : "bg-white"}`}>
                  {attack.matches.length ? (plain ? "Filter spots it" : "Scanner flags it") : plain ? "Filter misses it" : "Scanner misses it"}
                </span>
              )}
            </figcaption>
            {attack ? (
              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 flex flex-col gap-1.5">
                <span className="font-display font-bold text-[15px] leading-snug">{attack.heading}</span>
                <p className="font-mono text-[12px] leading-relaxed">
                  <Flagged text={attack.text} matches={attack.matches} />
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <input value={own.heading} onChange={(e) => setOwn({ ...own, heading: e.target.value })} maxLength={80} aria-label="Title of the planted file" className="shrink-0 h-10 px-3 border-b-2 border-brutal-black/20 font-display font-bold text-[15px] focus:outline-none focus:bg-cream" />
                <textarea
                  value={own.text}
                  onChange={(e) => setOwn({ ...own, text: e.target.value })}
                  maxLength={600}
                  aria-label="Text of the planted file"
                  placeholder={plain ? "Write what the file says. Try to make the bot say something false." : "20–600 characters. It's searched alongside the real files and kept for this request only."}
                  className="flex-1 min-h-0 resize-none px-3 py-2.5 font-mono text-[12px] leading-relaxed focus:outline-none focus:bg-cream"
                />
              </div>
            )}
          </figure>

          <div className="flex flex-col gap-3 min-w-0">
            <span className={label}>
              <T tech="A client asks" plain="Then a client asks" />
            </span>
            {attack ? (
              <div className="flex flex-col gap-2">
                {attack.questions.map((x) => (
                  <button key={x} type="button" onClick={() => setQ(x)} aria-pressed={q === x} className={`text-left h-11 px-3 border-[3px] border-brutal-black font-display text-[15px] truncate ${q === x ? "bg-brutal-yellow" : "bg-white hover:bg-cream"}`}>
                    {x}
                  </button>
                ))}
              </div>
            ) : (
              <input value={own.question} onChange={(e) => setOwn({ ...own, question: e.target.value })} maxLength={300} aria-label="Question" className="h-11 px-3 border-[3px] border-brutal-black bg-cream font-display text-[15px] focus:outline-none focus:bg-white" />
            )}
            <button type="button" onClick={run} disabled={busy} className="mt-auto h-12 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
              {busy ? "…" : plain ? "Ask both bots" : "Run both builds"}
            </button>
            <span className={`${label} opacity-50 truncate`}>{res ? `${res.remaining} ${plain ? "tries left this hour" : "runs left this hour"}` : plain ? "The file only exists for your question" : "Planted for this request only, never stored"}</span>
          </div>
        </div>
      </Stage>

      <div className="border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
        <div className="h-[4.5rem] sm:h-12 px-4 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-between gap-1 sm:gap-3 border-b-[3px] border-brutal-black bg-cream">
          <span className={label}>
            <T tech="Did search hand it over?" plain="Did the AI even see it?" />
          </span>
          <span className="font-mono text-[11.5px] font-bold">
            {error ? <span className="text-[#D4006A]">{error}</span> : busy ? (plain ? "Reading the files…" : "Searching 133 files plus yours…") : !res ? "\u00a0" : rank >= 0 ? (plain ? `Yes: it was the ${["1st", "2nd", "3rd", "4th", "5th"][rank]} of the five files the AI read` : `Yes, ranked #${rank + 1} of the 5 sources`) : plain ? "No: the real files beat it, so the AI never read it" : "No: it didn't make the top 5"}
          </span>
        </div>
        <div className={`grid grid-cols-1 lg:grid-cols-2 transition-opacity ${busy && res ? "opacity-40" : ""}`}>
          <div className="border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black min-w-0">
            <AnswerCard side={res?.open ?? null} res={res} guarded={false} />
          </div>
          <AnswerCard side={res?.guarded ?? null} res={res} guarded />
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="A pink citation points at the planted file. “Followed” is decided by code: the answer repeats what the file wanted and doesn't warn the reader off it. Your own file gets no verdict; read the answers."
          plain="A pink source number means the answer leaned on the planted file. For your own file there's no score: read both answers and judge."
        />
      </p>
    </div>
  );
}

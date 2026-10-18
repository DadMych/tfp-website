"use client";

import { Fragment, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import { CLIENTS, type ClientId } from "@/lib/privacy/access";
import type { Side, Who } from "@/lib/privacy/bot";
import { PERSONAS, QUESTIONS } from "@/lib/privacy/questions";
import { errorText } from "@/components/lab/ai/rag-client";

interface Result {
  careless: Side;
  careful: Side;
  remaining: number;
}

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const PINK = "#FF5CAA";
const GREEN = "#C6FF3D";
const short = (id: ClientId) => CLIENTS[id].split(" ")[0];
const of = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

function whoLabel(w: Who, plain: boolean) {
  if (w === "yours") return plain ? "Your file" : "Yours";
  if (w === "public") return "Public";
  if (w === "staff") return plain ? "Staff only" : "Internal";
  return of(short(w));
}

function Answer({ side, as, careful }: { side: Side | null; as: ClientId; careful: boolean }) {
  const { plain } = useExplain();
  const leaked = side ? side.cited.length > 0 : false;
  const owners = side ? [...new Set(side.sources.filter((s) => !s.allowed && side.cited.includes(s.doc)).map((s) => (s.who === "staff" ? (plain ? "staff-only" : "internal") : whoLabel(s.who, plain))))] : [];
  return (
    <div className="flex flex-col min-w-0">
      <div className="shrink-0 min-h-12 px-4 py-2 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black" style={{ background: careful ? GREEN : PINK }}>
        <span className={label}>
          {careful ? (
            <T tech={`Searches only what ${short(as)} may open`} plain={`Reads only ${of(short(as))} files`} />
          ) : (
            <T tech="Searches all 140, hides sources after" plain="Reads everything, hides sources" />
          )}
        </span>
        {side && (
          <span className={`${label} !tracking-[0.08em] shrink-0 flex items-center gap-1.5 px-1.5 py-0.5 border-2 border-brutal-black bg-white`}>
            <span className="size-2.5 border border-brutal-black" style={{ background: leaked ? PINK : GREEN }} />
            {leaked ? `${plain ? "Used" : "Quoted"} ${owners.join(" + ")} files` : plain ? "Only allowed files" : "Nothing foreign"}
          </span>
        )}
      </div>
      <div className="h-[11rem] overflow-y-auto p-4">
        {side ? (
          <p className="font-display text-[15px] leading-snug">
            {side.shown.split(/(\[\d+\]|\[·\])/).map((p, i) => {
              if (p === "[·]")
                return (
                  <span key={i} title={plain ? "The source was hidden from you" : "Citation removed by the filter"} className="font-mono text-[11px] font-bold px-1 mx-0.5 border border-brutal-black bg-brutal-black text-cream">
                    <span className="sr-only">[</span>hidden<span className="sr-only">]</span>
                  </span>
                );
              const m = p.match(/^\[(\d+)\]$/);
              if (!m) return <Fragment key={i}>{p}</Fragment>;
              return (
                <span key={i} title={side.sources[Number(m[1]) - 1]?.doc} className="font-mono text-[11px] font-bold px-1 mx-0.5 border border-brutal-black bg-white">
                  {p}
                </span>
              );
            })}
          </p>
        ) : (
          <p className="font-mono text-[11px] opacity-50">{"\u00a0"}</p>
        )}
      </div>
      <div className="border-t-[3px] border-brutal-black bg-cream">
        <div className="h-9 px-4 flex items-center border-b-2 border-brutal-black/20">
          <span className={label}>
            <T tech="What the AI read" plain="What the AI was given" />
          </span>
        </div>
        <ol className="flex flex-col">
          {Array.from({ length: 5 }, (_, i) => side?.sources[i]).map((s, i) => (
            <li key={i} className="h-9 px-4 flex items-center gap-2.5 border-b border-brutal-black/10 last:border-b-0 min-w-0" style={s && !s.allowed ? { background: "#FFD1E8" } : undefined}>
              <span className="font-mono text-[11px] font-bold w-5 shrink-0">[{i + 1}]</span>
              {s && (
                <>
                  <span className={`${label} !tracking-[0.06em] shrink-0 px-1.5 border-2 border-brutal-black ${s.allowed ? "bg-white" : "bg-[#FF5CAA]"}`}>{whoLabel(s.who, plain)}</span>
                  <span className="font-mono text-[11.5px] truncate">{s.heading || s.doc}</span>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function AskAs({ visible, total }: { visible: Record<string, number>; total: number }) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [as, setAs] = useState<ClientId>("brightlane");
  const [q, setQ] = useState(QUESTIONS[0].q);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ as: ClientId; r: Result } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suggestions = QUESTIONS.filter((x) => x.as === as);

  const choose = (id: ClientId) => {
    setAs(id);
    setRes(null);
    setError(null);
    setQ(QUESTIONS.find((x) => x.as === id)?.q ?? q);
  };

  const run = async () => {
    if (busy || q.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      setRes({ as, r: await labPost<Result>("/api/lab/privacy/ask", session, { question: q, as }) });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const r = res?.r;
  const foreign = r ? r.careless.sources.filter((s) => !s.allowed).length : 0;

  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-4">
        <span className={label}>
          <T tech="Logged in to Harbor as" plain="You're logged in as" />
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Logged in as">
          {PERSONAS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              aria-pressed={as === id}
              className={`shrink-0 h-12 px-3 flex flex-col items-start justify-center border-[3px] border-brutal-black text-left ${as === id ? "bg-brutal-black text-cream" : "bg-white hover:bg-cream"}`}
            >
              <span className="font-display font-bold text-sm leading-none">{CLIENTS[id]}</span>
              <span className="font-mono text-[10px] leading-none mt-1 opacity-70">
                {plain ? `may open ${visible[id]} of ${total} files` : `${visible[id]} of ${total} files`}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <span className={label}>
              <T tech={`${short(as)} asks the bot`} plain={`${short(as)} asks`} />
            </span>
            {suggestions.map((x) => (
              <button key={x.id} type="button" onClick={() => setQ(x.q)} aria-pressed={q === x.q} className={`text-left min-h-11 px-3 py-2 border-[3px] border-brutal-black font-display text-[15px] leading-snug ${q === x.q ? "bg-brutal-yellow" : "bg-white hover:bg-cream"}`}>
                {x.q}
              </button>
            ))}
            <input
              value={suggestions.some((x) => x.q === q) ? "" : q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              maxLength={300}
              aria-label="Question"
              placeholder={plain ? "Or type your own question" : "Or ask your own"}
              className="h-11 px-3 border-[3px] border-brutal-black bg-cream font-display text-[15px] focus:outline-none focus:bg-white"
            />
          </div>
          <div className="flex flex-col gap-3 min-w-0">
            <p className="font-display text-[14px] leading-snug">
              <T
                tech={`${short(as)} may open the public files and its own. The other ${total - visible[as]} belong to other clients or are internal.`}
                plain={`${short(as)} is allowed to see the public files and its own. The other ${total - visible[as]} belong to other clients or are only for staff.`}
              />
            </p>
            <button type="button" onClick={run} disabled={busy} className="mt-auto h-12 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
              {busy ? "…" : "Ask both bots"}
            </button>
            <span className={`${label} opacity-50 truncate`}>{r ? `${r.remaining} ${plain ? "tries left this hour" : "runs left this hour"}` : plain ? "Same question, same files, two bots" : "Same question, same 140 files, two builds"}</span>
          </div>
        </div>
      </Stage>

      <div className="border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
        <div className="min-h-12 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-between gap-1 sm:gap-3 border-b-[3px] border-brutal-black bg-cream">
          <span className={label}>
            <T tech="Did other people's files reach the AI?" plain="Did the AI see files it shouldn't?" />
          </span>
          <span className="font-mono text-[11.5px] font-bold">
            {error ? (
              <span className="text-[#D4006A]">{error}</span>
            ) : busy ? (
              plain ? "Reading the files…" : "Searching twice…"
            ) : !r ? (
              "\u00a0"
            ) : foreign ? (
              plain ? `Yes: ${foreign} of the 5 pieces the careless bot read aren't ${of(short(res.as))} to see` : `Careless: ${foreign} of 5 sources off-limits. Careful: 0, by construction`
            ) : plain ? (
              "No: this time the careless bot only read allowed files"
            ) : (
              "No: all 5 careless sources were allowed this time"
            )}
          </span>
        </div>
        <div className={`grid grid-cols-1 lg:grid-cols-2 transition-opacity ${busy && r ? "opacity-40" : ""}`}>
          <div className="border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black min-w-0">
            <Answer side={r?.careless ?? null} as={res?.as ?? as} careful={false} />
          </div>
          <Answer side={r?.careful ?? null} as={res?.as ?? as} careful />
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="Real: the 140 files, the search and the model, the same as Part 1. Simulated: the login. Who may open which file is a map I wrote: each client sees the public files and its own, staff see everything. A black “hidden” is a citation the careless filter removed. The words around it stayed."
          plain="Real: the files, the search and the AI are the same as Part 1. Pretend: the login. I decided which client may open which file. A black “hidden” tag is where the careless bot hid its source. The words stayed."
        />
      </p>
    </div>
  );
}

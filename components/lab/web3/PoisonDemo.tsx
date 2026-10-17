"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { payout, poison } from "@/lib/web3-lab";
import { ImplHeader, Note, RunButton, Stage } from "../money/ui";
import { T } from "../money/Explain";

type Kind = "real" | "zero" | "fake" | "dust" | "other";
interface Row {
  ago: string;
  dir: "out" | "in";
  amount: number;
  address: string;
}
interface State {
  round: string | null;
  freelancer: string;
  rows: Row[];
  left: number;
  result: { kinds: Kind[]; answer: number; picked: number; ms: number; timedOut: boolean; careless: number; careful: number } | null;
}

const URL = "/api/lab/web3/address-poisoning";
const fmt = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

const TRICK: Record<Exclude<Kind, "other">, { tech: string; plain: string }> = {
  real: { tech: "real payout", plain: "the real one" },
  zero: { tech: "zero-value transfer", plain: "fake, for 0" },
  fake: { tech: "fake-token transfer", plain: "fake money" },
  dust: { tech: "dust from look-alike", plain: "tiny fake gift" },
};

/** The address, with every character that differs from the real one marked once the round is over. */
function Addr({ a, real, mark }: { a: string; real: string; mark: boolean }) {
  if (!mark) return <>{a}</>;
  return (
    <>
      {[...a].map((c, i) => (
        <span key={i} className={c.toLowerCase() !== real[i]?.toLowerCase() ? "bg-[#FF5CAA]" : ""}>
          {c}
        </span>
      ))}
    </>
  );
}

export default function PoisonDemo() {
  const session = useLabSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number>(poison.seconds);
  const deadline = useRef<number | null>(null);

  const apply = useCallback((s: State) => {
    setState(s);
    deadline.current = s.round && !s.result ? Date.now() + s.left * 1000 : null;
    setLeft(s.result || !s.round ? poison.seconds : s.left);
  }, []);

  useEffect(() => {
    if (!session) return;
    labGet<State>(URL, session).then(apply, (e) => setError(e instanceof LabRequestError ? e.message : "couldn't load the round"));
  }, [session, apply]);

  const send = useCallback(
    async (body: { action: "new" } | { action: "pick"; round: string; row: number | null }) => {
      setBusy(true);
      setError(null);
      try {
        apply(await labPost<State>(URL, session, body));
      } catch (e) {
        setError(e instanceof LabRequestError ? e.message : "request failed");
      } finally {
        setBusy(false);
      }
    },
    [session, apply]
  );

  const playing = Boolean(state?.round && !state.result);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil(((deadline.current ?? 0) - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && state?.round) {
        clearInterval(id);
        void send({ action: "pick", round: state.round, row: null });
      }
    }, 250);
    return () => clearInterval(id);
  }, [playing, state?.round, send]);

  const rows = state?.rows ?? [];
  const res = state?.result ?? null;
  const real = state?.freelancer ?? "";
  const fooled = res != null && res.picked !== res.answer;
  const kindOf = (i: number): Kind | null => res?.kinds[i] ?? null;

  const sides = [
    {
      side: "careless" as const,
      kind: "bad" as const,
      title: "Copy from history",
      plainTitle: "Copies from past payments",
      note: "to = history.find(tx => looksLike(tx.to, freelancer)).to",
      plainNote: "Finds the newest payment that looks like theirs and copies that number.",
    },
    {
      side: "careful" as const,
      kind: "good" as const,
      title: "Pay the payee list",
      plainTitle: "Uses the saved contact",
      note: "to = payees.get(\"freelancer\") // added once, confirmed by a second person",
      plainNote: "Saved the number once, checked it with a second person, never copies it again.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:items-center">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-display font-black text-2xl md:text-3xl tracking-[-0.03em] tabular-nums">
                {payout.label} · {fmt(payout.units)}
              </span>
              <span className="font-mono text-[11px] leading-snug opacity-70">
                <T
                  tech={`Their address starts ${real.slice(0, 6) || "0x…"} and ends ${real.slice(-4) || "…"}. Copy it from the wallet history below.`}
                  plain={`Their account number starts ${real.slice(0, 6) || "0x…"} and ends ${real.slice(-4) || "…"}. Find it in past payments and click it.`}
                />
              </span>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-3 items-stretch lg:w-[20rem]">
              <div
                className={`border-[3px] border-brutal-black flex items-center justify-center font-display font-black text-2xl tabular-nums ${playing && left <= 10 ? "bg-[#FF5CAA]" : "bg-cream"}`}
                aria-live="off"
                aria-label="Seconds left"
              >
                0:{String(playing ? left : poison.seconds).padStart(2, "0")}
              </div>
              <div className="[&_button]:w-full">
                <RunButton onClick={() => send({ action: "new" })} busy={busy && !playing} disabled={!session || busy || playing} size="md">
                  {res ? <T tech="Deal again" plain="Play again" /> : <T tech="Start · 30 s" plain="Start" />}
                </RunButton>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <span className="absolute -top-2.5 left-3 z-10 bg-[#FFB3D9] border-[2px] border-brutal-black px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em]">Simulator</span>
          <ol className="flex flex-col border-[3px] border-brutal-black bg-cream" aria-label="Wallet history">
            {Array.from({ length: 8 }, (_, i) => {
              const r = rows[i];
              const k = kindOf(i);
              const picked = res?.picked === i;
              const tint = k === "real" ? "bg-[#C6FF3D]" : k && k !== "other" ? "bg-white" : "";
              return (
                <li key={i} className="border-b-[2px] border-brutal-black/10 last:border-b-0">
                  <button
                    type="button"
                    disabled={!playing || busy || !r}
                    onClick={() => state?.round && send({ action: "pick", round: state.round, row: i })}
                    className={`w-full h-16 sm:h-11 px-3 grid grid-cols-1 sm:grid-cols-[6.5rem_9.5rem_1fr_auto] content-center gap-x-3 gap-y-0.5 text-left font-mono min-w-0 enabled:hover:bg-brutal-yellow ${tint} ${picked ? "outline outline-[3px] -outline-offset-[3px] outline-brutal-black" : ""}`}
                  >
                    {!r ? (
                      <span className="text-[11px] opacity-30">{i === 0 ? <T tech="press Start to load the history" plain="Press Start to see past payments" /> : ""}</span>
                    ) : (
                      <>
                        <span className="flex items-center justify-between gap-2 text-[11px] sm:contents min-w-0">
                          <span className="opacity-60 truncate">{r.ago}</span>
                          <span className="font-bold tabular-nums truncate">
                            {r.dir === "out" ? "Sent " : "Got "}
                            {fmt(r.amount)}
                          </span>
                        </span>
                        <span className="text-[10px] sm:text-[11px] leading-tight tabular-nums min-w-0 w-[21ch] break-all sm:w-auto sm:break-normal sm:truncate">
                          <span className="hidden sm:inline opacity-60">{r.dir === "out" ? "to " : "from "}</span>
                          <Addr a={r.address} real={real} mark={k != null && k !== "other" && k !== "real"} />
                        </span>
                        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.1em] w-[9.5rem] text-right truncate">
                          {k && k !== "other" ? <T tech={TRICK[k].tech} plain={TRICK[k].plain} /> : picked ? "you" : ""}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8">
          {sides.map(({ side, ...h }) => {
            const i = res?.[side] ?? -1;
            const bad = res != null && res.kinds[i] !== "real";
            return (
              <div key={side} className="flex flex-col gap-4">
                <ImplHeader {...h} />
                <div className={`h-20 border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] px-4 flex flex-col justify-center gap-1 min-w-0 ${!res ? "bg-cream" : bad ? "bg-[#FF5CAA]" : "bg-[#C6FF3D]"}`}>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-70 truncate">
                    <T tech={!res ? `${fmt(payout.units)} sent to` : bad ? "Sent to the attacker" : "Sent to the freelancer"} plain="The money went to" />
                  </span>
                  <span className="font-display font-black text-lg sm:text-xl leading-tight truncate">
                    {!res ? "—" : bad ? <T tech={short(rows[i].address)} plain="The scammer" /> : <T tech={short(real)} plain="The freelancer" />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Stage>

      <Note tone={error ? "bad" : fooled ? "bad" : "neutral"}>
        {error ? (
          error
        ) : !state?.round ? (
          <T
            tech={`Eight rows of the studio wallet's history, newest first. Three of them were planted by an attacker. You have ${poison.seconds} seconds; out of time, you copy the top row.`}
            plain={`Eight past payments, newest first. A scammer slipped three of them in. You have ${poison.seconds} seconds. Run out, and you copy the top one, like someone in a hurry.`}
          />
        ) : !res ? (
          <T tech="Click the row to copy the address from." plain="Click the payment you'd copy the number from." />
        ) : res.timedOut ? (
          <T
            tech={`Out of time: you copied the top row, a zero-value transfer from a look-alike. The real payout was row ${res.answer + 1}. The pink characters are the ones that differ.`}
            plain={`Out of time, so you copied the top one: the scammer's. The real payment was number ${res.answer + 1}. The pink characters are the ones that don't match.`}
          />
        ) : fooled ? (
          <T
            tech={`Row ${res.picked + 1} was the attacker's ${TRICK[res.kinds[res.picked] as Exclude<Kind, "other" | "real">]?.tech ?? "address"}. The real payout was row ${res.answer + 1}. First four and last four match; the pink characters don't.`}
            plain={`That one was the scammer's. The real payment was number ${res.answer + 1}. The start and end match; the pink characters don't.`}
          />
        ) : (
          <T
            tech={`Right, in ${(res.ms / 1000).toFixed(1)} s. The careless payout still copies the top look-alike every time, because a script doesn't hesitate. The payee list never reads history at all.`}
            plain={`Right, in ${(res.ms / 1000).toFixed(1)} seconds. Someone in a hurry would still pick the top one. The careful way never copies from past payments at all.`}
          />
        )}
      </Note>
    </div>
  );
}

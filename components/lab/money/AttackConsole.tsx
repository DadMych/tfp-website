"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ATTACK, LEVELS, type AmountCents, type Level, type RequestEvent } from "@/lib/lab/double-spend";
import { labGet, labStream, LabRequestError, useLabSession } from "@/lib/lab/client";
import { formatCents, moneyLimits } from "@/lib/money-lab";
import { T, useExplain } from "./Explain";
import AttackScene, { EXAMPLE, exampleEvents, phantomSet } from "./AttackScene";
import { narrate } from "./narrate";

type DoneEvt = { attackId: string; approved: number; declined: number; refused: number; finalBalance: number; spent: number; extracted: number; durationMs: number; maxInFlight: number };
type Run = { level: Level; requests: number; concurrency: number; amount: number };
type Phase = "idle" | "running" | "done" | "error";
type Mode = "example" | "live" | "replay";

const money = (c: number) => formatCents(c).replace(/\.00$/, "");
const knobs = (r: Run) => `${r.requests}/${r.concurrency}/${r.amount}`;

export default function AttackConsole() {
  const session = useLabSession();
  const { plain } = useExplain();

  const [level, setLevel] = useState<Level>(1);
  const [requests, setRequests] = useState<number>(ATTACK.requests.default);
  const [concurrency, setConcurrency] = useState<number>(ATTACK.concurrency.default);
  const [amount, setAmount] = useState<AmountCents>(ATTACK.defaultAmount);
  const [tune, setTune] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [done, setDone] = useState<DoneEvt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const loadLimit = useCallback(() => {
    labGet<{ remaining: number; resetAt: number }>("/api/lab/money/double-spend/run", session)
      .then((r) => {
        setRemaining(r.remaining);
        setResetAt(r.resetAt);
      })
      .catch(() => undefined);
  }, [session]);
  useEffect(() => {
    if (session !== null) loadLimit();
  }, [session, loadLimit]);
  const limited = remaining === 0;
  const resetClock = resetAt ? new Date(resetAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  /** Duration of the last run per level, keyed by the knobs, so L3 and L4 can be compared like for like. */
  const [times, setTimes] = useState<Record<string, Partial<Record<Level, number>>>>({});
  const abortRef = useRef<AbortController | null>(null);

  /* ── one clock for the picture, the caption and the scrubber ── */
  const tRef = useRef(-40);
  const [t, setT] = useState(-40);
  const [mode, setMode] = useState<Mode>("example");
  const clock = useRef({ mode: "example" as Mode, playing: true, dur: EXAMPLE.dur as number, secondsPerPass: 11, last: 0, liveStart: 0, hold: 800 });

  useEffect(() => {
    let raf = 0;
    let lastSet = 0;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const c = clock.current;
      const dt = c.last ? Math.min(100, now - c.last) : 0;
      c.last = now;
      if (c.mode === "live") tRef.current = now - c.liveStart;
      else if (c.playing) {
        if (c.hold > 0) c.hold -= dt;
        else {
          tRef.current += dt * (c.dur / (c.secondsPerPass * 1000));
          if (tRef.current >= c.dur + 60) {
            if (c.mode === "example") {
              tRef.current = -40;
              c.hold = 3000;
            } else {
              tRef.current = c.dur + 60;
              c.playing = false;
            }
          }
        }
      }
      if (now - lastSet > 50) {
        lastSet = now;
        setT(Math.round(tRef.current));
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const startExample = useCallback(() => {
    Object.assign(clock.current, { mode: "example", dur: EXAMPLE.dur, secondsPerPass: 11, hold: 600, playing: true });
    tRef.current = -40;
    setMode("example");
  }, []);
  const startReplay = useCallback((dur: number) => {
    Object.assign(clock.current, { mode: "replay", dur, secondsPerPass: Math.min(30, Math.max(18, dur / 50)), hold: 800, playing: true });
    tRef.current = -60;
    setMode("replay");
  }, []);
  const scrub = (v: number) => {
    if (clock.current.mode === "live") return;
    clock.current.playing = false;
    clock.current.hold = 0;
    tRef.current = v;
    setT(v);
  };
  const replayAgain = () => {
    if (clock.current.mode === "live") return;
    clock.current.playing = true;
    clock.current.hold = 500;
    tRef.current = -60;
  };
  const pickLevel = (l: Level) => {
    setLevel(l);
    setShowCode(false);
    if (run && l === run.level && mode === "example") {
      Object.assign(clock.current, { mode: "replay", dur: done?.durationMs ?? 0, playing: false });
      tRef.current = clock.current.dur + 60;
      setMode("replay");
    } else if (!run || l !== run.level) startExample();
  };

  /* ── data ── */
  const attack = useCallback(async () => {
    if (phase === "running") return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const params: Run = { level, requests, concurrency, amount };
    setPhase("running");
    setEvents([]);
    setDone(null);
    setError(null);
    setRun(params);
    const c = clock.current;
    c.mode = "live";
    c.liveStart = performance.now() + 150;
    tRef.current = -150;
    setMode("live");
    const buf: RequestEvent[] = [];
    let flushTimer: number | null = null;
    const flush = () => {
      flushTimer = null;
      setEvents([...buf]);
    };
    try {
      await labStream(
        "/api/lab/money/double-spend/run",
        session,
        params,
        (ev, data) => {
          if (ev === "start") {
            setRemaining((data as { remaining: number }).remaining);
            c.liveStart = performance.now();
          } else if (ev === "req") {
            buf.push(data as RequestEvent);
            if (flushTimer === null) flushTimer = window.setTimeout(flush, 40);
          } else if (ev === "done") {
            if (flushTimer !== null) window.clearTimeout(flushTimer);
            setEvents([...buf]);
            const d = data as DoneEvt;
            setDone(d);
            setTimes((prev) => ({ ...prev, [knobs(params)]: { ...prev[knobs(params)], [params.level]: d.durationMs } }));
            setPhase("done");
            startReplay(d.durationMs);
          } else if (ev === "error") {
            setError(String((data as { message?: string }).message ?? "attack failed"));
            setPhase("error");
            startExample();
          }
        },
        ac.signal
      );
    } catch (e) {
      if (ac.signal.aborted) return;
      if (e instanceof LabRequestError && e.status === 429) {
        setRemaining(0);
        loadLimit();
        setError("limit");
      } else setError(e instanceof LabRequestError ? e.message : "attack failed");
      setPhase("error");
      startExample();
    }
  }, [phase, level, requests, concurrency, amount, session, startReplay, startExample, loadLimit]);

  /* ── what the picture shows ── */
  const showingRun = run !== null && level === run.level && mode !== "example";
  const sceneEvents = useMemo(() => (showingRun ? events : exampleEvents(level)), [showingRun, events, level]);
  const scene = showingRun
    ? { lanes: run!.concurrency, start: ATTACK.startCents, amount: run!.amount, dur: done?.durationMs ?? Math.max(50, ...events.map((e) => e.t1)) }
    : { lanes: EXAMPLE.lanes, start: EXAMPLE.start, amount: EXAMPLE.amount, dur: EXAMPLE.dur };
  const def = LEVELS[level];
  const sceneLevel = showingRun ? run!.level : level;

  const captions = useMemo(
    () => (showingRun ? narrate(events, run!.level, ATTACK.startCents, run!.amount, run!.concurrency, done?.extracted ?? null) : narrate(sceneEvents, level, EXAMPLE.start, EXAMPLE.amount, 3, null)),
    [showingRun, events, run, done, sceneEvents, level]
  );
  const caption = useMemo(() => {
    let cur: (typeof captions)[number] | null = null;
    for (const c of captions) if (c.t <= t) cur = c;
    return cur;
  }, [captions, t]);

  const busy = phase === "running";
  const live = mode === "live";

  return (
    <>
      <div className="flex flex-col gap-5">
      <div className="border-[3px] border-brutal-black bg-white text-brutal-black shadow-[8px_8px_0_0_#000]">
        {/* level tabs */}
        <ol className="flex overflow-x-auto border-b-[3px] border-brutal-black divide-x-[3px] divide-brutal-black" aria-label="Defence level">
          {LEVELS.map((l) => {
            const active = l.id === level;
            return (
              <li key={l.id} className="flex-1 min-w-[150px]">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => pickLevel(l.id)}
                  aria-pressed={active}
                  className={`w-full h-full text-left px-4 py-3 flex items-baseline gap-3 transition-colors disabled:cursor-not-allowed ${active ? "bg-brutal-yellow" : "hover:bg-cream"}`}
                >
                  <span className="font-display font-black text-2xl leading-none">{l.id}</span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-display font-bold text-sm leading-tight">{plain ? l.plain : l.name}</span>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${l.holds ? "text-brutal-green" : "text-brutal-red"}`}>{l.holds ? "holds" : "breaks"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* picture */}
        <AttackScene events={sceneEvents} lanes={scene.lanes} level={sceneLevel} start={scene.start} amount={scene.amount} plain={plain} tRef={tRef} example={!showingRun} finalBalance={showingRun ? done?.finalBalance : undefined} />

        {/* how to read the picture */}
        <ul className="border-t-[3px] border-brutal-black bg-white px-5 sm:px-8 py-3 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-2 font-mono text-[10px] leading-tight">
          {[
            { chip: money(scene.amount), cls: "bg-white", tech: "a payment, on its way", plain: "one payment, on its way" },
            { chip: "read?", cls: "bg-white", tech: "SELECT balance", plain: "shop asks how much is left" },
            { chip: money(scene.start), cls: "bg-brutal-yellow", tech: "the balance it was told", plain: "the answer it got" },
            sceneLevel === 1 || sceneLevel === 2
              ? { chip: `=${money(scene.start - scene.amount)}`, cls: "bg-white", tech: "SET balance = what it read − price", plain: "tells the bank the new total" }
              : { chip: `−${money(scene.amount)}`, cls: "bg-white", tech: "UPDATE balance − price", plain: "asks the bank to take it" },
            { chip: "", cls: "bg-brutal-yellow rounded-full w-3.5 h-3.5", tech: "at the database, waiting for a reply", plain: "at the bank, waiting for an answer" },
            { chip: "✓", cls: "bg-brutal-green", tech: "approved, money existed", plain: "paid, the money was there" },
            { chip: "✓", cls: "bg-brutal-red", tech: "approved, money did not exist", plain: "paid with money that isn't there" },
            { chip: "✗", cls: "bg-[#C8C2AE]", tech: "declined", plain: "refused" },
          ].map((it) => (
            <li key={it.tech} className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 border-[1.5px] border-brutal-black font-bold ${it.chip ? "px-1.5 py-0.5" : ""} ${it.cls}`}>{it.chip}</span>
              <span className="min-w-0">
                <T tech={it.tech} plain={it.plain} />
              </span>
            </li>
          ))}
        </ul>

        {/* caption */}
        <div className="border-t-[3px] border-brutal-black bg-brutal-black text-cream px-5 sm:px-8 h-[11rem] sm:h-[8.5rem] flex flex-col sm:flex-row justify-center sm:justify-start sm:items-center gap-2 sm:gap-5 overflow-hidden">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-yellow sm:w-16 shrink-0">{showingRun ? (live ? "live" : "replay") : "example"}</span>
          <p className="font-display font-black uppercase tracking-[-0.02em] text-base sm:text-xl md:text-2xl leading-tight" aria-live="polite">
            {caption ? (plain ? caption.plain : caption.tech) : plain ? def.holePlain : def.hole}
          </p>
        </div>

        {/* scrubber */}
        <div className="border-t-[3px] border-brutal-black px-5 sm:px-8 h-12 flex items-center gap-4 bg-cream">
          <input type="range" min={-60} max={scene.dur + 60} step={1} value={Math.min(scene.dur + 60, Math.max(-60, t))} disabled={live} onChange={(e) => scrub(Number(e.target.value))} className="lab-range w-full" aria-label="Replay position" />
          <span className="font-mono text-xs tabular-nums whitespace-nowrap">
            {Math.min(scene.dur, Math.max(0, t))} <span className="text-brutal-black/50">/ {scene.dur} ms</span>
          </span>
          <button
            type="button"
            onClick={replayAgain}
            disabled={!showingRun || live}
            className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] border-[2px] border-brutal-black px-2 py-1 hover:bg-brutal-yellow disabled:opacity-0 disabled:pointer-events-none"
          >
            ↺ replay
          </button>
        </div>
      </div>

        {/* action row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[auto_1fr_auto] gap-4 items-stretch">
          <button
            type="button"
            onClick={attack}
            disabled={busy || session === null || limited}
            className={`lg:w-[19rem] whitespace-nowrap border-[3px] border-brutal-black px-8 py-3 flex flex-col items-center gap-1 font-display font-black uppercase tracking-[-0.02em] shadow-[5px_5px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow,background-color,color] disabled:cursor-not-allowed ${
              limited ? "bg-[#FF5CAA] text-brutal-black" : "bg-brutal-yellow text-brutal-black hover:bg-brutal-black hover:text-brutal-yellow disabled:cursor-wait disabled:opacity-70"
            }`}
          >
            <span className="text-3xl leading-tight">
              {busy ? (
                <>
                  Attacking <span className="font-mono text-lg align-middle">{events.length}/{run?.requests}</span>
                </>
              ) : limited ? (
                "Limit reached"
              ) : (
                <T tech={`Attack L${level} →`} plain="Attack →" />
              )}
            </span>
            <span className="font-mono text-[10px] font-bold tracking-[0.15em]">
              {limited
                ? `${moneyLimits.dsRunsPerHour}/${moneyLimits.dsRunsPerHour} used · back at ${resetClock ?? "the top of the hour"}`
                : `${remaining ?? moneyLimits.dsRunsPerHour} of ${moneyLimits.dsRunsPerHour} attacks left this hour`}
            </span>
          </button>
          <label className="flex flex-col justify-center gap-2 px-2 py-1 md:col-span-2 md:order-last lg:col-span-1 lg:order-none">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                <T tech="Concurrency" plain="At the same time" />
              </span>
              <span className="font-display font-black text-2xl leading-none tabular-nums">
                {concurrency} <span className="inline-block w-[11rem] text-right font-mono text-[11px] font-normal opacity-70">{concurrency === 1 ? <T tech="serial — nothing races" plain="one by one — nothing to exploit" /> : <T tech="in flight at once" plain="payments in the same instant" />}</span>
              </span>
            </span>
            <input type="range" min={ATTACK.concurrency.min} max={ATTACK.concurrency.max} step={1} value={concurrency} disabled={busy} onChange={(e) => setConcurrency(Number(e.target.value))} className="lab-range w-full" />
          </label>
          <button
            type="button"
            onClick={() => setTune((s) => !s)}
            aria-expanded={tune}
            className="lg:w-[14rem] whitespace-nowrap px-5 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] border-[3px] border-brutal-black bg-white text-brutal-black shadow-[5px_5px_0_0_#000] hover:bg-brutal-yellow text-left md:text-center"
          >
            {requests} × {money(amount)} <span className="opacity-50">· tune {tune ? "↑" : "↓"}</span>
          </button>
        </div>

        {tune && (
          <div className="border-[3px] border-brutal-black grid grid-cols-1 md:grid-cols-2 gap-6 px-5 sm:px-8 py-5 bg-white text-brutal-black shadow-[5px_5px_0_0_#000]">
            <label className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                  <T tech="Requests" plain="Payments" />
                </span>
                <span className="font-display font-black text-2xl leading-none tabular-nums">{requests}</span>
              </span>
              <input type="range" min={ATTACK.requests.min} max={ATTACK.requests.max} step={10} value={requests} disabled={busy} onChange={(e) => setRequests(Number(e.target.value))} className="lab-range w-full" />
            </label>
            <div className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                <T tech="Amount" plain="Price" />
                <span className="text-brutal-black/50 normal-case tracking-normal font-normal">
                  <T tech={`$100 funds ${Math.floor(ATTACK.startCents / amount)}`} plain={`the card can afford ${Math.floor(ATTACK.startCents / amount)}`} />
                </span>
              </span>
              <div className="grid grid-cols-4 border-[3px] border-brutal-black divide-x-[3px] divide-brutal-black bg-white">
                {ATTACK.amounts.map((a) => (
                  <button key={a} type="button" disabled={busy} aria-pressed={a === amount} onClick={() => setAmount(a)} className={`h-10 font-mono text-sm font-bold transition-colors ${a === amount ? "bg-brutal-black text-cream" : "hover:bg-brutal-yellow"}`}>
                    {money(a)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* verdict: one slot, same size before, during and after a run */}
        {error ? (
          <div role="alert" className={`h-[22rem] md:h-[10.5rem] overflow-hidden border-[3px] border-brutal-black shadow-[8px_8px_0_0_#000] px-5 sm:px-8 flex items-center font-display font-bold text-lg sm:text-xl leading-snug ${error === "limit" ? "bg-[#FF5CAA] text-brutal-black" : "bg-brutal-red text-cream"}`}>
            {error === "limit" ? (
              <T
                tech={`Rate limit: ${moneyLimits.dsRunsPerHour} attacks per hour per visitor, all used. The counter resets at ${resetClock ?? "the top of the hour"}. The limit keeps the free Postgres alive; the example above still plays.`}
                plain={`You have used all ${moneyLimits.dsRunsPerHour} attacks for this hour. More at ${resetClock ?? "the top of the hour"}. The limit keeps the demo database alive for everyone; the example above still plays.`}
              />
            ) : (
              error
            )}
          </div>
        ) : !(done && run && showingRun) ? (
          <div className="h-[22rem] md:h-[10.5rem] overflow-hidden border-[3px] border-dashed border-brutal-black bg-white/70 text-brutal-black px-5 sm:px-8 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 md:gap-8 items-center">
            <div className="font-display font-black uppercase tracking-[-0.03em] leading-none text-5xl sm:text-6xl opacity-25">{busy ? "…" : "$?"}</div>
            <p className="font-display font-bold text-lg sm:text-xl leading-snug">
              {busy ? (
                <T tech="Attack running. The result lands here." plain="Payments are hitting the card. The result lands here." />
              ) : (
                <T
                  tech={`Press Attack. ${requests} real requests hit a real Postgres row holding $100. The money you walk away with lands here.`}
                  plain={`Press Attack. ${requests} payments hit a card holding $100, all at once. Whatever you get out beyond $100 is money that never existed.`}
                />
              )}
            </p>
          </div>
        ) : (
          <div className={`h-[22rem] md:h-[10.5rem] overflow-hidden border-[3px] border-brutal-black shadow-[8px_8px_0_0_#000] px-5 sm:px-8 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 md:gap-8 items-center ${done.extracted > 0 ? "bg-[#FF5CAA] text-brutal-black" : "bg-[#C6FF3D] text-brutal-black"}`}>
            <div className="font-display font-black uppercase tracking-[-0.03em] leading-none text-5xl sm:text-6xl">{done.extracted > 0 ? `+${money(done.extracted)}` : "$0"}</div>
            <div className="flex flex-col gap-1">
              <p className="font-display font-bold text-lg sm:text-xl leading-snug">
                <Verdict done={done} run={run} plain={plain} times={times[knobs(run)] ?? {}} />
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-80">
                {done.approved} approved · {done.declined + done.refused} declined · balance {money(done.finalBalance)} · {done.durationMs} ms
              </p>
            </div>
            {run.level < 4 && (
              <button
                type="button"
                onClick={() => pickLevel((run.level + 1) as Level)}
                className="border-[3px] border-brutal-black bg-brutal-black text-cream px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-brutal-black transition-colors"
              >
                <T tech={`Harden to L${run.level + 1} →`} plain={`Try defence ${run.level + 1} →`} />
              </button>
            )}
          </div>
        )}

        {/* for engineers, folded */}
        <div className="border-[3px] border-brutal-black grid grid-cols-2 sm:grid-cols-[auto_auto_1fr] divide-x-[3px] divide-brutal-black bg-white text-brutal-black">
          <button type="button" onClick={() => setShowCode((s) => !s)} aria-expanded={showCode} className="px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow">
            The code {showCode ? "↑" : "↓"}
          </button>
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            aria-expanded={showAll}
            disabled={!(showingRun && events.length > 0)}
            className="px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <T tech="Every request" plain="Every payment" /> {showAll ? "↑" : "↓"}
          </button>
          <span className="col-span-2 sm:col-span-1 border-t-[3px] sm:border-t-0 border-brutal-black px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] opacity-50 sm:text-right">
            Limit: {moneyLimits.dsRunsPerHour} attacks / hour per visitor
          </span>
        </div>
        {showCode && (
          <div className="border-[3px] border-brutal-black bg-brutal-black text-cream">
            <p className="px-5 sm:px-8 pt-4 font-mono text-[11px] text-brutal-yellow uppercase tracking-[0.2em] font-bold">
              L{level} · {def.tag}
            </p>
            <pre className="px-5 sm:px-8 py-4 overflow-x-auto font-mono text-xs leading-relaxed">
              <code>{def.code}</code>
            </pre>
          </div>
        )}
        {showAll && showingRun && events.length > 0 && (
          <div className="border-[3px] border-brutal-black bg-white text-brutal-black px-5 sm:px-8 py-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
                <T tech="Lane per worker · bar per request · tick = read" plain="Every payment as a bar, start to finish" />
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.15em]">
                <li className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-brutal-green border border-brutal-black" /> <T tech="funded" plain="real money" /></li>
                <li className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-brutal-red border border-brutal-black" /> <T tech="phantom" plain="from nowhere" /></li>
                <li className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-[#C8C2AE] border border-brutal-black" /> declined</li>
                <li className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 bg-brutal-yellow border border-brutal-black" /> CHECK</li>
              </ul>
            </div>
            <Timeline events={events} lanes={run!.concurrency} amount={run!.amount} level={run!.level} finalBalance={done?.finalBalance} dur={scene.dur} at={t} />
          </div>
        )}
      </div>

    </>
  );
}

/* ────────────────────────────── pieces ─────────────────────────────────── */

const W = 1000;
const LANE = 10;
const GAP = 2;
const AXIS = 18;

function Timeline({ events, lanes, amount, level, finalBalance, dur, at }: { events: RequestEvent[]; lanes: number; amount: number; level: Level; finalBalance?: number; dur: number; at: number }) {
  const [hover, setHover] = useState<{ e: RequestEvent; x: number; y: number; w: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const D = Math.max(50, dur);
  const H = lanes * (LANE + GAP) + AXIS;
  const x = (tt: number) => (tt / D) * W;
  const phantom = useMemo(() => phantomSet(events, ATTACK.startCents, amount, level, finalBalance), [events, amount, level, finalBalance]);
  const fill = (e: RequestEvent) => (e.outcome === "approved" ? (phantom.has(e.seq) ? "#FF0000" : "#22C55E") : e.outcome === "refused" ? "#FFE600" : "#C8C2AE");
  const place = (e: RequestEvent, ev: React.MouseEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    return { e, x: ev.clientX - (r?.left ?? 0), y: ev.clientY - (r?.top ?? 0), w: r?.width ?? 400 };
  };
  return (
    <div ref={wrap} className="relative border-[3px] border-brutal-black bg-cream" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: `clamp(120px, ${H * 0.8}px, 440px)` }} preserveAspectRatio="none" role="img" aria-label={`${events.length} requests across ${lanes} workers over ${D} ms`}>
        {Array.from({ length: lanes }).map((_, i) => (
          <line key={i} x1={0} x2={W} y1={i * (LANE + GAP) + LANE / 2} y2={i * (LANE + GAP) + LANE / 2} stroke="#000" strokeOpacity={0.05} strokeWidth={LANE} />
        ))}
        {events.map((e) => {
          const y = e.worker * (LANE + GAP);
          const x0 = x(e.t0);
          const w = Math.max(1.5, x(e.t1) - x0);
          return (
            <g key={e.seq} opacity={e.t0 > at ? 0.2 : 1}>
              <rect x={x0} y={y} width={w} height={LANE} fill={fill(e)} onMouseEnter={(ev) => setHover(place(e, ev))} onMouseMove={(ev) => setHover(place(e, ev))} />
              {e.tRead !== null && <rect x={x(e.tRead)} y={y} width={1.4} height={LANE} fill="#000" pointerEvents="none" />}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H - AXIS + 1} y2={H - AXIS + 1} stroke="#000" strokeOpacity={0.4} strokeWidth={1} />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={Math.min(W - 2, Math.max(2, f * W))} y={H - 4} fontSize={9} fill="#000" fillOpacity={0.6} fontFamily="ui-monospace, monospace" textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}>
            {Math.round(f * D)} ms
          </text>
        ))}
        {at >= 0 && at <= D && <line x1={x(at)} x2={x(at)} y1={0} y2={H - AXIS} stroke="#000" strokeWidth={2} pointerEvents="none" />}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute z-20 border-[2px] border-brutal-black bg-white px-2 py-1.5 font-mono text-[10px] leading-snug whitespace-nowrap shadow-brutal-sm" style={{ left: Math.min(hover.x + 12, hover.w - 220), top: Math.max(0, hover.y - 56) }}>
          <span className="block font-bold">
            #{hover.e.seq + 1} · worker {hover.e.worker + 1} · {hover.e.outcome}
            {phantom.has(hover.e.seq) ? " (phantom)" : ""}
          </span>
          <span className="block">
            {hover.e.read !== null ? `read ${money(hover.e.read)} → ` : ""}
            {hover.e.after !== null ? `balance ${money(hover.e.after)}` : "no write"}
          </span>
          <span className="block text-brutal-black/60">
            {hover.e.t0}–{hover.e.t1} ms{hover.e.tRead !== null ? ` · read at ${hover.e.tRead}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function Verdict({ done, run, plain, times }: { done: DoneEvt; run: Run; plain: boolean; times: Partial<Record<Level, number>> }) {
  const def = LEVELS[run.level];
  const maxFunded = Math.floor(ATTACK.startCents / run.amount);
  if (done.extracted > 0) return plain ? `You walked away with ${money(done.extracted)} the business never had. ${def.holePlain}` : `${done.approved} approved where only ${maxFunded} were funded. ${def.hole}`;
  if (run.level <= 2)
    return plain ? `Nothing this time. The bug is still there; your payments just did not overlap. Turn "at the same time" up and try again.` : `Zero extracted, but not because the code is safe: with concurrency ${run.concurrency} nothing raced. Raise it.`;
  const ms = done.durationMs;
  const head = plain ? `${done.approved} went through: exactly what $100 buys. Took ${ms} ms.` : `Exactly ${maxFunded} approved, balance ${money(done.finalBalance)}, ${ms} ms.`;
  const l3 = times[3];
  const l4 = times[4];
  if (run.level === 3)
    return `${head} ${
      l4 !== undefined
        ? plain
          ? `Level 4 did the same attack in ${l4} ms${ms > l4 ? `, ${(ms / l4).toFixed(1)}× faster` : ""}.`
          : `L4, same knobs: ${l4} ms${ms > l4 ? ` (${(ms / l4).toFixed(1)}× faster)` : ""}.`
        : plain
          ? `Safe, but everyone waited. Run Level 4 with the same settings and compare.`
          : `The lock is held across round trips. Run L4 with the same knobs and compare.`
    }`;
  return `${head} ${
    l3 !== undefined
      ? plain
        ? `Level 3 needed ${l3} ms for the same attack${l3 > ms ? `: ${(l3 / ms).toFixed(1)}× slower` : ""}.`
        : `L3, same knobs: ${l3} ms${l3 > ms ? ` (${(l3 / ms).toFixed(1)}× slower)` : ""}.`
      : plain
        ? `Run Level 3 with the same settings to see what waiting in line costs.`
        : `Run L3 with the same knobs to see the cost of holding the lock.`
  }`;
}

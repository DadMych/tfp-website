"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { labGet, labStream, LabRequestError, useLabSession } from "@/lib/lab/client";
import { formatCents, moneyLimits } from "@/lib/money-lab";
import { CellGrid, type CellStatus, ImplHeader, Legend, Limits, Note, RunButton, Stage } from "./ui";
import { T, useExplain } from "./Explain";

const SLOTS = 20;
const TAPS = [2, 5, 20] as const;
type Taps = (typeof TAPS)[number];
const AMOUNT = 4900;
const money = (c: number) => formatCents(c).replace(/\.00$/, "");

type Level = "none" | "check_then_insert" | "unique_key";
const LEVELS: Level[] = ["none", "check_then_insert", "unique_key"];
const META: Record<Level, { kind: "bad" | "good"; title: string; note: string; plainTitle: string; plainNote: string }> = {
  none: { kind: "bad", title: "No key", note: "INSERT charge. Every request is new.", plainTitle: "No protection", plainNote: "Every tap becomes a new charge." },
  check_then_insert: {
    kind: "bad",
    title: "Key checked in code",
    note: "SELECT key → not found → INSERT charge → INSERT key",
    plainTitle: "Checks a list first",
    plainNote: "Asks 'have I seen this receipt?', then charges. Taps that arrive together all look before any one writes.",
  },
  unique_key: {
    kind: "good",
    title: "Key owned by Postgres",
    note: "INSERT key ON CONFLICT DO NOTHING → 0 rows = replay",
    plainTitle: "The database keeps the list",
    plainNote: "Only one tap can claim the receipt number. Everyone else gets the first one's answer.",
  },
};

interface Summary {
  charges: Record<Level, number>;
  durationMs: number;
}

const slots = (taps: number, s: CellStatus): CellStatus[] => Array.from({ length: SLOTS }, (_, i) => (i < taps ? s : "off"));
const blank = (taps: number): Record<Level, CellStatus[]> => ({ none: slots(taps, "idle"), check_then_insert: slots(taps, "idle"), unique_key: slots(taps, "idle") });
const zero = (): Record<Level, number> => ({ none: 0, check_then_insert: 0, unique_key: 0 });

export default function IdempotencyDemo() {
  const session = useLabSession();
  const { plain } = useExplain();
  const [taps, setTaps] = useState<Taps>(20);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Level | null>(null);
  const [cells, setCells] = useState(() => blank(20));
  const [charged, setCharged] = useState(zero);
  const [key, setKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<(Summary & { taps: Taps }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);

  const loadLimit = useCallback(() => {
    labGet<{ remaining: number; resetAt: number }>("/api/lab/money/idempotency/run", session)
      .then((r) => {
        setRemaining(r.remaining);
        setResetAt(r.resetAt);
      })
      .catch(() => undefined);
  }, [session]);
  useEffect(() => {
    if (session !== null) loadLimit();
  }, [session, loadLimit]);
  useEffect(() => () => abort.current?.abort(), []);

  const limited = remaining === 0;
  const resetClock = resetAt ? new Date(resetAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const pickTaps = (n: Taps) => {
    if (running) return;
    setTaps(n);
    setSummary(null);
    setError(null);
    setCells(blank(n));
    setCharged(zero());
  };

  async function run() {
    const n = taps;
    setRunning(true);
    setError(null);
    setSummary(null);
    setCells(blank(n));
    setCharged(zero());
    abort.current = new AbortController();
    try {
      await labStream(
        "/api/lab/money/idempotency/run",
        session,
        { attempts: n },
        (event, data) => {
          if (event === "start") {
            const d = data as { key: string; remaining: number };
            setKey(d.key);
            setRemaining(d.remaining);
          } else if (event === "phase") {
            const d = data as { level: Level };
            setPhase(d.level);
            setCells((c) => ({ ...c, [d.level]: slots(n, "pending") }));
          } else if (event === "request") {
            const d = data as { level: Level; seq: number; outcome: "charged" | "double_charged" | "replayed" };
            setCells((c) => {
              const next = c[d.level].slice();
              next[d.seq - 1] = d.outcome === "charged" ? "ok" : d.outcome === "double_charged" ? "bad" : "rejected";
              return { ...c, [d.level]: next };
            });
            if (d.outcome !== "replayed") setCharged((c) => ({ ...c, [d.level]: c[d.level] + 1 }));
          } else if (event === "summary") {
            setSummary({ ...(data as Summary), taps: n });
          } else if (event === "error") {
            setError((data as { message: string }).message);
          }
        },
        abort.current.signal
      );
    } catch (e) {
      if (e instanceof LabRequestError && e.status === 429) {
        setRemaining(0);
        loadLimit();
        setError("limit");
      } else if (e instanceof LabRequestError) setError(e.message);
      else if ((e as Error).name !== "AbortError") setError("stream failed");
    } finally {
      setRunning(false);
      setPhase(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        {/* controls: one row, nothing below the stage but the verdict */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] xl:grid-cols-[auto_auto_1fr] gap-5 md:gap-x-8 items-start pb-6 border-b-[3px] border-brutal-black">
          <div className="flex flex-col gap-2">
            <RunButton onClick={run} busy={running} disabled={!session || limited}>
              {running ? <T tech="Storming" plain="Tapping" /> : limited ? "Limit reached" : <T tech={`Send ${taps} retries →`} plain={`Tap pay ${taps}× →`} />}
            </RunButton>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
              {limited
                ? `${moneyLimits.idemRunsPerHour}/${moneyLimits.idemRunsPerHour} used · back at ${resetClock ?? "the top of the hour"}`
                : `${remaining ?? moneyLimits.idemRunsPerHour} of ${moneyLimits.idemRunsPerHour} tries left this hour`}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              <T tech="Identical requests" plain="How many taps" />
            </span>
            <div className="grid grid-cols-3 border-[3px] border-brutal-black divide-x-[3px] divide-brutal-black w-full lg:w-[15rem]" role="group" aria-label="Number of taps">
              {TAPS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={running}
                  aria-pressed={n === taps}
                  onClick={() => pickTaps(n)}
                  className={`h-12 font-display font-black text-xl transition-colors disabled:cursor-not-allowed ${n === taps ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}
                >
                  {n}×
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] leading-snug opacity-60 h-[2lh]">
              {taps === 2 ? (
                <T tech="A double-tap. The race window is small." plain="A double-tap. Sometimes the list gets lucky." />
              ) : taps === 5 ? (
                <T tech="A flaky network retrying." plain="A phone on a bad signal, retrying." />
              ) : (
                <T tech="A retry storm from a queue or client." plain="Twenty at once. Nobody gets lucky." />
              )}
            </span>
          </div>

          <div className="flex flex-col gap-2 min-w-0 md:col-span-2 xl:col-span-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              <T tech="Each request" plain="What every tap sends" />
            </span>
            {plain ? (
              <p className="font-display text-base leading-snug h-[3lh]">
                &quot;Charge order <span className="font-mono text-sm">#{key ? key.replace(/^order_/, "") : "…"}</span>, {money(AMOUNT)}.&quot; Same order, same amount, {taps} times. Only the shop can tell
                they are one payment.
              </p>
            ) : (
              <pre className="h-[4.75rem] border-[3px] border-brutal-black bg-brutal-black text-cream px-3 py-2 font-mono text-[11px] leading-relaxed overflow-x-auto">
                {`POST /charge   × ${taps}, at once
Idempotency-Key: ${key ?? "order_········"}
{ "amount_cents": ${AMOUNT} }`}
              </pre>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-[auto_auto_auto] gap-8 md:gap-x-6 md:gap-y-4">
          {LEVELS.map((lv) => {
            const m = META[lv];
            const n = charged[lv];
            const over = n > 1;
            const waiting = running && phase !== null && phase !== lv && n === 0;
            return (
              <div key={lv} className={`flex flex-col gap-4 md:row-span-3 md:grid md:grid-rows-subgrid transition-opacity ${waiting ? "opacity-50" : ""}`}>
                <ImplHeader kind={m.kind} title={m.title} note={m.note} plainTitle={m.plainTitle} plainNote={m.plainNote} />
                <CellGrid cells={cells[lv]} cols={5} label={`${m.title}: ${n} charges created of ${taps} requests`} />
                <Statement n={n} over={over} />
              </div>
            );
          })}
        </div>

        <Legend
          items={[
            { status: "ok", label: <T tech="charged" plain="charged once" /> },
            { status: "bad", label: <T tech="charged again" plain="charged again" /> },
            { status: "rejected", label: <T tech="replayed stored response" plain="got the first answer again" /> },
            { status: "pending", label: <T tech="in flight" plain="waiting" /> },
            { status: "off", label: <T tech="not sent" plain="not tapped" /> },
          ]}
        />
      </Stage>

      {error === "limit" ? (
        <Note tone="bad">
          <T
            tech={`Rate limit: ${moneyLimits.idemRunsPerHour} runs per hour per visitor, all used. Resets at ${resetClock ?? "the top of the hour"}. It keeps the free Postgres alive.`}
            plain={`You have used all ${moneyLimits.idemRunsPerHour} tries for this hour. More at ${resetClock ?? "the top of the hour"}. The limit keeps the demo database alive for everyone.`}
          />
        </Note>
      ) : error ? (
        <Note tone="bad">{error}</Note>
      ) : summary ? (
        <Note tone={summary.charges.check_then_insert > 1 ? "warn" : "neutral"}>
          <Verdict s={summary} plain={plain} />
        </Note>
      ) : (
        <Note>
          {running ? (
            <T tech={`Storming. ${taps * 3} requests, three handlers, one Postgres.`} plain={`Tapping. ${taps} taps, three versions of the shop, one after another.`} />
          ) : (
            <T
              tech={`${taps} identical requests, sent at once, to each of three handlers. The customer should be billed ${money(AMOUNT)} once.`}
              plain={`One ${money(AMOUNT)} payment, tapped ${taps} times at once, sent to three versions of the same shop. The customer should pay once.`}
            />
          )}
        </Note>
      )}

      <Limits>
        <T
          tech={`Limit: ${moneyLimits.idemRunsPerHour} runs per hour per visitor. Each run writes one row to idem.runs and up to ${SLOTS * 2 + 1} rows to idem.charges. Rows older than 24 hours are deleted.`}
          plain={`${moneyLimits.idemRunsPerHour} runs an hour each. Everything is wiped after a day.`}
        />
      </Limits>
    </div>
  );
}

/** The customer's card statement for one version of the shop. */
function Statement({ n, over }: { n: number; over: boolean }) {
  const tone = over ? "bg-[#FF5CAA]" : n === 1 ? "bg-[#C6FF3D]" : "bg-white";
  return (
    <div className={`border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] px-4 py-3 flex flex-col gap-2 ${tone}`}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-70 truncate">
        <T tech="Customer billed" plain="Card statement" />
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display font-black text-3xl lg:text-4xl leading-none tracking-[-0.04em] tabular-nums">{money(n * AMOUNT)}</span>
        <span className="font-display font-black text-xl lg:text-2xl leading-none tabular-nums">{n}×</span>
      </div>
      <span className="font-mono text-[10px] leading-tight opacity-70 truncate">
        <T tech={`owed 1 × ${money(AMOUNT)}`} plain={`should be 1 × ${money(AMOUNT)}`} />
      </span>
    </div>
  );
}

function Verdict({ s, plain }: { s: Summary & { taps: Taps }; plain: boolean }) {
  const c = s.charges;
  const extra = (c.none - 1 + Math.max(0, c.check_then_insert - 1)) * AMOUNT;
  if (plain)
    return (
      <>
        {s.taps} taps. No protection charged {c.none} times. The list charged {c.check_then_insert === 1 ? "once — lucky this time, try 20×" : `${c.check_then_insert} times: everyone looked before anyone wrote`}. The
        database charged once. {extra > 0 ? `${money(extra)} the customer would want back.` : ""}
      </>
    );
  return (
    <>
      No key: {c.none} charges. Key checked in code: {c.check_then_insert}
      {c.check_then_insert > 1 ? ", every request read before the first one wrote." : ", the race was lost by nobody this time."} Key owned by Postgres: {c.unique_key}.{" "}
      {Math.round(s.durationMs)} ms for {s.taps * 3} requests.
    </>
  );
}

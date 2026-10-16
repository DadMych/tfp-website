"use client";

import { useCallback, useEffect, useState } from "react";
import { labGet, labStream, LabRequestError, useLabSession } from "@/lib/lab/client";
import { aiLimits } from "@/lib/ai-lab";
import type { AgentEvent, CallEvent, Outcome } from "@/lib/ai/agent";
import type { Side } from "@/lib/ai/scenarios";
import { ImplHeader, Note, RawRows, RunButton, Stage } from "../money/ui";
import { DbRows, T, useExplain } from "../money/Explain";

export interface ScenarioButton {
  id: string;
  label: string;
  plainLabel?: string;
  task: string;
}

export interface SideCopy {
  title: string;
  note: string;
  plainTitle: string;
  plainNote: string;
}

export interface Said {
  tech: string;
  plain: string;
}

export interface SideRun {
  calls: CallEvent[];
  outcome?: Outcome;
  report?: string;
  error?: string;
  replay?: boolean;
}

export type Stats = { scenario: string; side: Side; runs: number; broke: number }[];

interface Props {
  article: string;
  scenarios: ScenarioButton[];
  careless: SideCopy;
  guarded: SideCopy;
  /** One line under each column once its run ends. */
  verdict: (side: Side, run: SideRun) => Said & { tone: "bad" | "good" | "neutral" };
  /** The Note under the stage after a run. */
  summary: (runs: Record<Side, SideRun>) => Said;
  /** The Note before anything was pressed. */
  intro: Said;
  /** The measured line, from every real run of this scenario in the last 7 days. */
  measured: (careless: { runs: number; broke: number }, guarded: { runs: number; broke: number }) => Said;
}

const STEP_ROWS = 6;
const MAIL_ROWS = 3;
const SIDES: Side[] = ["careless", "guarded"];
const EMPTY: Record<Side, SideRun> = { careless: { calls: [] }, guarded: { calls: [] } };
const dot = { done: "bg-[#C6FF3D]", blocked: "bg-brutal-yellow", proposed: "bg-brutal-yellow", error: "bg-[#FF5CAA]" } as const;
const tone = { bad: "bg-[#FF5CAA]", good: "bg-[#C6FF3D]", neutral: "bg-white" } as const;

export default function AgentDemo({ article, scenarios, careless, guarded, verdict, summary, intro, measured }: Props) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [picked, setPicked] = useState(scenarios[0].id);
  const [runs, setRuns] = useState<Record<Side, SideRun>>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [budget, setBudget] = useState<{ capUsd: number; leftUsd: number } | null>(null);
  const [replay, setReplay] = useState(false);
  const [stats, setStats] = useState<Stats>([]);

  const load = useCallback(() => {
    labGet<{ remaining: number; resetAt: number; budget: { capUsd: number; leftUsd: number }; stats: Stats }>(`/api/lab/ai/run?article=${article}`, session)
      .then((r) => {
        setRemaining(r.remaining);
        setResetAt(r.resetAt);
        setBudget(r.budget);
        setStats(r.stats);
      })
      .catch(() => undefined);
  }, [article, session]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  async function run(id: string) {
    setPicked(id);
    setBusy(true);
    setError(null);
    setReplay(false);
    setRuns({ careless: { calls: [] }, guarded: { calls: [] } });
    try {
      await labStream("/api/lab/ai/run", session, { article, scenario: id }, (event, data) => {
        if (event === "start") {
          const d = data as { remaining: number; replay: boolean };
          setRemaining(d.remaining);
          setReplay(d.replay);
        } else if (event === "step") {
          const d = data as AgentEvent & { side: Side; message?: string };
          setRuns((prev) => {
            const s = { ...prev[d.side] };
            if (d.k === "call") s.calls = [...s.calls, d];
            else if (d.k === "end") Object.assign(s, { outcome: d.outcome, report: d.text });
            else if ((d as { k: string }).k === "error") s.error = d.message;
            return { ...prev, [d.side]: s };
          });
        } else if (event === "done") {
          const d = data as { sides: ({ side: Side; replay: boolean } | null)[]; budget: { capUsd: number; leftUsd: number } };
          setBudget(d.budget);
          setRuns((prev) => {
            const next = { ...prev };
            for (const s of d.sides) if (s) next[s.side] = { ...next[s.side], replay: s.replay };
            return next;
          });
        }
      });
      load();
    } catch (e) {
      if (e instanceof LabRequestError && e.status === 429) {
        setRemaining(0);
        load();
        setError("limit");
      } else setError(e instanceof LabRequestError ? e.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  const task = scenarios.find((s) => s.id === picked) ?? scenarios[0];
  const limited = remaining === 0;
  const resetClock = resetAt ? new Date(resetAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const ended = SIDES.every((s) => runs[s].outcome || runs[s].error);
  const pressed = SIDES.some((s) => runs[s].calls.length > 0 || runs[s].outcome);
  const tally = (side: Side) => stats.find((x) => x.scenario === picked && x.side === side) ?? { runs: 0, broke: 0 };
  const m = measured(tally("careless"), tally("guarded"));
  const said = (x: Said) => (plain ? x.plain : x.tech);

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid gap-3 [&_button]:w-full [&_button]:px-2 [&_button]:text-sm sm:[&_button]:text-base" style={{ gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))` }}>
            {scenarios.map((s) => (
              <RunButton key={s.id} onClick={() => run(s.id)} busy={busy && picked === s.id} disabled={!session || busy || limited} size="md" tone={picked === s.id ? "yellow" : "white"}>
                {s.plainLabel ? <T tech={s.label} plain={s.plainLabel} /> : s.label}
              </RunButton>
            ))}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech="Each button runs the task twice, in parallel, on claude-haiku-5-5. Same system prompt, same tools, same task. Only the code around the tools differs."
                plain="Each button gives the same task to two copies of the same AI, at the same time. Same instructions. The only difference is the code around it."
              />
            </span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
              {limited
                ? `Limit reached · back at ${resetClock ?? "the top of the hour"}`
                : `${remaining ?? aiLimits.runsPerHour} of ${aiLimits.runsPerHour} runs left this hour${budget ? ` · $${budget.leftUsd.toFixed(2)} of $${budget.capUsd} AI budget left today` : ""}`}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="opacity-60">
              <T tech="User message" plain="The task" />
            </span>
            {replay && <span className="ml-3 bg-brutal-yellow px-1.5 text-brutal-black">Replay · today&apos;s AI budget is spent</span>}
          </span>
          <p className="h-[4.5rem] sm:h-12 border-[3px] border-brutal-black bg-cream px-4 flex items-center font-mono text-xs sm:text-sm leading-snug overflow-hidden">“{task.task}”</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto_auto] gap-10 lg:gap-x-8 lg:gap-y-5">
          {SIDES.map((side) => {
            const r = runs[side];
            const copy = side === "careless" ? careless : guarded;
            const v = r.outcome && r.outcome !== "budget" ? verdict(side, r) : null;
            return (
              <div key={side} className="min-w-0 flex flex-col gap-5 lg:row-span-5 lg:grid lg:grid-cols-1 lg:grid-rows-subgrid">
                <ImplHeader kind={side === "careless" ? "bad" : "good"} title={copy.title} note={copy.note} plainTitle={copy.plainTitle} plainNote={copy.plainNote} />
                <Steps run={r} busy={busy} />
                <Outbox calls={r.calls} />
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
                    <T tech="Final reply" plain="What it told you" />
                  </span>
                  <p className="h-[7.5rem] sm:h-[5.75rem] border-[3px] border-brutal-black bg-white px-3 py-2 font-display text-sm leading-snug overflow-hidden">
                    {r.error ? <span className="text-[#c0006a] font-bold">{r.error}</span> : r.report ? <span className="line-clamp-5 sm:line-clamp-4">{r.report.replace(/\*\*/g, "")}</span> : <span className="opacity-30 font-mono text-[11px]">{busy ? "…" : "Nothing yet"}</span>}
                  </p>
                </div>
                <div className={`h-[4.5rem] sm:h-14 border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] px-4 flex items-center font-display font-black text-sm sm:text-base leading-tight ${v ? tone[v.tone] : "bg-cream"}`}>
                  <span className="line-clamp-3 sm:line-clamp-2">{v ? said(v) : r.outcome === "budget" ? <T tech="Daily budget ran out mid-run." plain="The AI budget for today ran out mid-run." /> : <span className="opacity-30 font-mono text-[11px] font-normal">{busy ? "Running…" : "—"}</span>}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Stage>

      <Note tone={error ? "bad" : ended && pressed && runs.careless.outcome === "broke" ? "bad" : "neutral"}>
        {error === "limit" ? (
          <T
            tech={`Rate limit: ${aiLimits.runsPerHour} runs per hour per visitor, all used. Resets at ${resetClock ?? "the top of the hour"}.`}
            plain={`You have used all ${aiLimits.runsPerHour} runs for this hour. More at ${resetClock ?? "the top of the hour"}. Every run costs real money, so there is a cap.`}
          />
        ) : error ? (
          error
        ) : ended && pressed ? (
          <>
            {said(summary(runs))} <span className="opacity-80">{said(m)}</span>
          </>
        ) : (
          <>
            {said(intro)} {tally("careless").runs > 0 && <span className="opacity-80">{said(m)}</span>}
          </>
        )}
      </Note>

      <DbRows>
        <RawRows<CallRow>
          title="Tool calls exactly as the model sent them"
          rows={SIDES.flatMap((side) => runs[side].calls.map((c, i) => ({ side, n: i + 1, tool: c.tool, stop: c.stop, args: JSON.stringify(c.input), result: c.status })))}
          empty="Press a task above."
          columns={[
            { key: "side", label: "Side" },
            { key: "n", label: "#", align: "right" },
            { key: "tool", label: "Tool" },
            { key: "stop", label: "stop_reason", render: (r) => <span className={r.stop === "max_tokens" ? "text-brutal-coral font-bold" : ""}>{r.stop}</span> },
            { key: "result", label: "Result" },
            { key: "args", label: "Arguments", render: (r) => <span title={r.args}>{r.args.length > 90 ? r.args.slice(0, 90) + "…" : r.args}</span> },
          ]}
        />
      </DbRows>
    </div>
  );
}

type CallRow = { side: Side; n: number; tool: string; stop: string; args: string; result: string };

function Steps({ run, busy }: { run: SideRun; busy: boolean }) {
  const calls = run.calls;
  const hidden = Math.max(0, calls.length - (STEP_ROWS - 1));
  const shown = hidden > 0 ? calls.slice(-(STEP_ROWS - 1)) : calls;
  const working = busy && !run.outcome && !run.error;
  const rows: React.ReactNode[] = [];
  if (hidden > 0) rows.push(<span className="opacity-50">+ {hidden} earlier {hidden === 1 ? "step" : "steps"}</span>);
  shown.forEach((c, i) =>
    rows.push(
      <span key={i} className="flex items-center gap-2.5 min-w-0">
        <span className={`w-2.5 h-2.5 shrink-0 border-[2px] border-brutal-black ${dot[c.status]}`} aria-hidden="true" />
        <span className={`min-w-0 leading-tight line-clamp-2 sm:line-clamp-1 ${c.status !== "done" ? "font-bold" : ""}`} title={c.line}>
          {c.line}
        </span>
      </span>
    )
  );
  if (working && rows.length < STEP_ROWS) rows.push(<span className="pulse-dot opacity-50">thinking…</span>);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
        <T tech="Tool calls" plain="What it did" />
      </span>
      <ol className="flex flex-col border-[3px] border-brutal-black bg-cream" aria-label="What the agent did">
        {Array.from({ length: STEP_ROWS }, (_, i) => (
          <li key={i} className="h-11 sm:h-8 px-3 flex items-center border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] min-w-0">
            {rows[i] ?? (i === 0 && !working ? <span className="opacity-30">Press a task above</span> : null)}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Outbox({ calls }: { calls: CallEvent[] }) {
  const sent = calls.filter((c) => c.tool === "send_email" && c.status === "done");
  const extra = Math.max(0, sent.length - MAIL_ROWS);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
        <T tech={`Outbox · ${sent.length} sent`} plain={`Emails that went out · ${sent.length}`} />
        {extra > 0 && <span className="ml-2">(+{extra} more)</span>}
      </span>
      <ul className="flex flex-col border-[3px] border-brutal-black bg-white">
        {Array.from({ length: MAIL_ROWS }, (_, i) => {
          const c = sent[i];
          const body = c ? String(c.input.body ?? "").trim() : "";
          return (
            <li key={i} className="h-14 px-3 flex flex-col justify-center gap-0.5 border-b-[2px] border-brutal-black/10 last:border-b-0 min-w-0">
              {c ? (
                <>
                  <span className="font-mono text-[10px] opacity-60 truncate">
                    To {String(c.input.to ?? "?")} · {String(c.input.subject ?? "(no subject)")}
                  </span>
                  <span className="flex items-center gap-2 min-w-0 font-display text-[13px] leading-tight">
                    {!body ? (
                      <span className="shrink-0 bg-[#FF5CAA] border-[2px] border-brutal-black px-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">Empty</span>
                    ) : c.stop === "max_tokens" ? (
                      <span className="shrink-0 bg-brutal-yellow border-[2px] border-brutal-black px-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">Cut off</span>
                    ) : null}
                    <span className="truncate">{body || <span className="opacity-50">no text at all</span>}</span>
                  </span>
                </>
              ) : (
                <span className="font-mono text-[11px] opacity-20">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

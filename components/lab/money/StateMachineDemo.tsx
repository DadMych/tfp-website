"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { formatCents, moneyLimits } from "@/lib/money-lab";
import { ImplHeader, Limits, Note, RawRows, RunButton, Stage } from "./ui";
import { DbRows, T, useExplain } from "./Explain";

type Impl = "naive" | "guarded";
type Action = "authorize" | "capture" | "void" | "refund";
type Press = Action | "refund_twice" | "chaos";
type Code = "illegal" | "stale" | "check";

interface Payment {
  id: string;
  impl: Impl;
  state: string;
  amount_cents: number;
  refunded_cents: number;
  version: number;
}
interface TransitionRow extends Record<string, unknown> {
  id: number;
  impl: Impl;
  action: string;
  from_state: string;
  to_state: string | null;
  ok: boolean;
  reason: string | null;
  at: string;
}

const ACTIONS: { id: Action; label: string; plain: string }[] = [
  { id: "authorize", label: "Authorize", plain: "Reserve" },
  { id: "capture", label: "Capture", plain: "Charge" },
  { id: "void", label: "Void", plain: "Cancel" },
  { id: "refund", label: "Refund", plain: "Refund" },
];
const ACT_PLAIN: Record<string, string> = { authorize: "Reserve", capture: "Charge", void: "Cancel", refund: "Refund" };
const STATE_PLAIN: Record<string, string> = { created: "new", authorized: "reserved", captured: "paid", refunded: "refunded", voided: "cancelled" };
const sp = (s: string | null | undefined) => (s ? (STATE_PLAIN[s] ?? s) : "—");
const money = (c: number) => formatCents(c).replace(/\.00$/, "");
const codeOf = (r: string | null): Code | null => {
  if (!r) return null;
  const c = r.split(":")[0];
  return c === "illegal" || c === "stale" || c === "check" ? c : "illegal";
};
const detail = (r: string | null) => (r ? r.replace(/^(illegal|stale|check):\s*/, "") : "");

/* ── State diagram. Legal moves in black; moves the rulebook forbids, done anyway, in red. ── */

const R = 34;
type Layout = { w: number; h: number; nodes: Record<string, { x: number; y: number }> };
const WIDE: Layout = {
  w: 530,
  h: 244,
  nodes: { created: { x: 58, y: 96 }, authorized: { x: 196, y: 96 }, captured: { x: 334, y: 96 }, refunded: { x: 472, y: 96 }, voided: { x: 196, y: 196 } },
};
/** Phones: three across, two down, so the labels stay readable. */
const COMPACT: Layout = {
  w: 340,
  h: 290,
  nodes: { created: { x: 50, y: 96 }, authorized: { x: 168, y: 96 }, captured: { x: 286, y: 96 }, refunded: { x: 286, y: 236 }, voided: { x: 168, y: 236 } },
};
const EDGES: [string, string, string][] = [
  ["created", "authorized", "authorize"],
  ["authorized", "captured", "capture"],
  ["captured", "refunded", "refund"],
  ["authorized", "voided", "void"],
];
const isEdge = (a: string, b: string) => EDGES.some(([x, y]) => x === a && y === b);

function jumpPath(NODES: Layout["nodes"], a: string, b: string): { d: string; lx: number; ly: number } {
  const A = NODES[a];
  const B = NODES[b];
  if (!A || !B) return { d: "", lx: 0, ly: 0 };
  if (a === b) {
    const d = `M ${A.x - 14} ${A.y - R + 2} C ${A.x - 34} ${A.y - R - 44}, ${A.x + 34} ${A.y - R - 44}, ${A.x + 14} ${A.y - R + 2}`;
    return { d, lx: A.x, ly: A.y - R - 38 };
  }
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  let cx: number;
  let cy: number;
  if (Math.abs(dy) < 1) {
    // Same row: always arc below, away from the move labels above the row.
    // Longer jumps arc deeper; backward ones deeper still, so A→B and B→A never share a curve.
    const bend = Math.min(120, (22 + 0.22 * len) * (dx > 0 ? 1 : 1.6));
    cx = (A.x + B.x) / 2;
    cy = A.y + bend;
  } else {
    cx = (A.x + B.x) / 2 - uy * 46;
    cy = (A.y + B.y) / 2 + ux * 46;
  }
  const toward = (P: { x: number; y: number }, off: number) => {
    const l = Math.hypot(cx - P.x, cy - P.y);
    return { x: P.x + ((cx - P.x) / l) * off, y: P.y + ((cy - P.y) / l) * off };
  };
  const s = toward(A, R);
  const e = toward(B, R + 4);
  return { d: `M ${s.x} ${s.y} Q ${cx} ${cy} ${e.x} ${e.y}`, lx: (s.x + 2 * cx + e.x) / 4, ly: (s.y + 2 * cy + e.y) / 4 };
}

function Diagram(props: { state: string; broken: boolean; rows: TransitionRow[]; plain: boolean }) {
  return (
    <>
      <div className="sm:hidden">
        <DiagramSvg {...props} layout={COMPACT} />
      </div>
      <div className="hidden sm:block">
        <DiagramSvg {...props} layout={WIDE} />
      </div>
    </>
  );
}

function DiagramSvg({ state, broken, rows, plain, layout }: { state: string; broken: boolean; rows: TransitionRow[]; plain: boolean; layout: Layout }) {
  const NODES = layout.nodes;
  const uid = useId().replace(/:/g, "");
  const used = new Set<string>();
  const jumps = new Map<string, number>();
  for (const r of rows) {
    if (!r.ok || !r.to_state) continue;
    const bad = r.impl === "naive" && r.reason !== null;
    if (!bad && isEdge(r.from_state, r.to_state)) used.add(`${r.from_state}>${r.to_state}`);
    else jumps.set(`${r.from_state}>${r.to_state}`, (jumps.get(`${r.from_state}>${r.to_state}`) ?? 0) + 1);
  }
  const jumpPaths = [...jumps.entries()]
    .map(([k, n]) => {
      const [a, b] = k.split(">");
      return { k, n, ...jumpPath(NODES, a, b) };
    })
    .filter((j) => j.d);
  return (
    <svg viewBox={`0 0 ${layout.w} ${layout.h}`} className="w-full h-auto border-[3px] border-brutal-black bg-white" role="img" aria-label={`Payment state: ${state}`}>
      <defs>
        <marker id={`a${uid}`} markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto">
          <path d="M0,0 L12,6 L0,12 z" fill="#000" />
        </marker>
        <marker id={`r${uid}`} markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto">
          <path d="M0,0 L12,6 L0,12 z" fill="#FF0000" />
        </marker>
      </defs>
      {EDGES.map(([a, b, label]) => {
        const A = NODES[a];
        const B = NODES[b];
        const vertical = A.x === B.x;
        const x1 = vertical ? A.x : A.x + R;
        const y1 = vertical ? A.y + R : A.y;
        const x2 = vertical ? B.x : B.x - R;
        const y2 = vertical ? B.y - R : B.y;
        const on = used.has(`${a}>${b}`);
        return <line key={label} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={on ? 5 : 2} opacity={on ? 1 : 0.35} markerEnd={`url(#a${uid})`} />;
      })}
      {jumpPaths.map(({ k, d }) => (
        <path key={k} d={d} fill="none" stroke="#FF0000" strokeWidth="3" strokeDasharray="6 4" markerEnd={`url(#r${uid})`} />
      ))}
      {jumpPaths
        .filter((j) => j.n > 1)
        .map(({ k, n, lx, ly }) => (
          <g key={`n${k}`}>
            <rect x={lx - 13} y={ly - 9} width="26" height="16" fill="#FF0000" stroke="#fff" strokeWidth="2" />
            <text x={lx} y={ly + 3} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="#fff">
              ×{n}
            </text>
          </g>
        ))}
      {/* labels sit on top of the red jumps, with a white halo so they stay readable */}
      {EDGES.map(([a, b, label]) => {
        const A = NODES[a];
        const B = NODES[b];
        const vertical = A.x === B.x;
        const flip = vertical && A.x + 70 > layout.w;
        const on = used.has(`${a}>${b}`);
        return (
          <text
            key={label}
            x={vertical ? (flip ? A.x - 10 : A.x + 10) : (A.x + B.x) / 2}
            y={vertical ? (A.y + B.y) / 2 + 4 : A.y - 14}
            textAnchor={vertical ? (flip ? "end" : "start") : "middle"}
            fontFamily="var(--font-mono)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.1em"
            fill={on ? "#000" : "#777"}
            stroke="#fff"
            strokeWidth="5"
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {(plain ? ACT_PLAIN[label] : label).toUpperCase()}
          </text>
        );
      })}
      {Object.entries(NODES).map(([name, p]) => {
        const current = name === state;
        return (
          <g key={name}>
            <circle cx={p.x} cy={p.y} r={R} fill={current ? (broken ? "#FF0000" : "#FFE600") : "#fff"} stroke="#000" strokeWidth="3" />
            <text
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="9.5"
              fontWeight="700"
              letterSpacing="0.04em"
              fill={current && broken ? "#fff" : "#000"}
            >
              {(plain ? sp(name) : name).toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── One line in a side's history ── */

function line(r: TransitionRow, plain: boolean): { text: string; tone: "ok" | "bad" | "no" } {
  const code = codeOf(r.reason);
  const act = plain ? ACT_PLAIN[r.action] ?? r.action : r.action;
  if (!plain) {
    if (r.ok) return { text: `${r.action} ${r.from_state} → ${r.to_state}${code ? ` · ${detail(r.reason)}` : ""}`, tone: code ? "bad" : "ok" };
    return { text: `${r.action} refused · ${detail(r.reason)}`, tone: "no" };
  }
  if (r.ok && r.impl === "naive" && code === "illegal") return { text: `${act} → ${sp(r.to_state)}. Not allowed from ${sp(r.from_state)}.`, tone: "bad" };
  if (r.ok && r.impl === "naive" && code === "stale") return { text: `${act} → ${sp(r.to_state)}, over someone else's ${act.toLowerCase()}.`, tone: "bad" };
  if (r.ok) return { text: `${act} → ${sp(r.to_state)}.`, tone: "ok" };
  if (code === "stale") return { text: `${act}: no. Someone changed it a moment ago.`, tone: "no" };
  if (code === "check") return { text: `${act}: no. More than was paid.`, tone: "no" };
  return { text: `${act}: no. The payment is ${sp(r.from_state)}.`, tone: "no" };
}

const LOG_ROWS = 5;
const dot = { ok: "bg-[#C6FF3D]", bad: "bg-[#FF0000]", no: "bg-brutal-yellow" } as const;

/* ── What a side's history adds up to ── */

function sum(rows: TransitionRow[], p: Payment | null) {
  const charged = rows.some((r) => r.ok && r.to_state === "captured");
  const paid = charged ? (p?.amount_cents ?? 0) : 0;
  return {
    clicks: rows.length,
    paid,
    refunded: p?.refunded_cents ?? 0,
    breaks: rows.filter((r) => r.ok && r.reason !== null).length,
    refused: rows.filter((r) => !r.ok).length,
    stale: rows.filter((r) => !r.ok && codeOf(r.reason) === "stale").length,
    illegal: rows.filter((r) => !r.ok && codeOf(r.reason) === "illegal").length,
    check: rows.filter((r) => !r.ok && codeOf(r.reason) === "check").length,
  };
}

export default function StateMachineDemo() {
  const session = useLabSession();
  const [payments, setPayments] = useState<Record<Impl, Payment | null>>({ naive: null, guarded: null });
  const [log, setLog] = useState<TransitionRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const { plain } = useExplain();

  const refresh = useCallback(async () => {
    if (!session) return 0;
    const s = await labGet<{ payments: Payment[]; transitions: TransitionRow[] }>("/api/lab/money/state-machine/state", session);
    setPayments({
      naive: s.payments.find((p) => p.impl === "naive") ?? null,
      guarded: s.payments.find((p) => p.impl === "guarded") ?? null,
    });
    setLog(s.transitions);
    return s.payments.length;
  }, [session]);

  const loadLimit = useCallback(() => {
    labGet<{ remaining: number; resetAt: number }>("/api/lab/money/state-machine/act", session)
      .then((r) => {
        setRemaining(r.remaining);
        setResetAt(r.resetAt);
      })
      .catch(() => undefined);
  }, [session]);

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof LabRequestError && e.status === 429) {
        setRemaining(0);
        loadLimit();
        setError("limit");
      } else setError(e instanceof LabRequestError ? e.message : "request failed");
    },
    [loadLimit]
  );

  const reset = useCallback(async () => {
    setBusy("reset");
    setError(null);
    try {
      const r = await labPost<{ remaining: number }>("/api/lab/money/state-machine/act", session, { action: "reset" });
      setRemaining(r.remaining);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }, [session, refresh, fail]);

  useEffect(() => {
    if (!session) return;
    loadLimit();
    refresh()
      .then((n) => {
        if (n === 0) void reset();
      })
      .catch(() => void reset());
  }, [session, refresh, reset, loadLimit]);

  async function press(action: Press) {
    setBusy(action);
    setError(null);
    try {
      const r = await labPost<{ remaining: number }>("/api/lab/money/state-machine/act", session, { action });
      setRemaining(r.remaining);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  const limited = remaining === 0;
  const resetClock = resetAt ? new Date(resetAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const disabled = !session || busy !== null || !payments.naive || limited;
  const rows: Record<Impl, TransitionRow[]> = {
    naive: log.filter((r) => r.impl === "naive").reverse(),
    guarded: log.filter((r) => r.impl === "guarded").reverse(),
  };
  const s = { naive: sum(rows.naive, payments.naive), guarded: sum(rows.guarded, payments.guarded) };
  const lost = Math.max(0, s.naive.refunded - s.naive.paid);

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        {/* controls: one set of buttons, both shops get every click */}
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 [&_button]:w-full">
              {ACTIONS.map((a) => (
                <RunButton key={a.id} onClick={() => press(a.id)} busy={busy === a.id} disabled={disabled} size="md" tone="white">
                  <T tech={a.label} plain={a.plain} />
                </RunButton>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 [&_button]:w-full lg:w-[22rem]">
              <RunButton onClick={() => press("refund_twice")} busy={busy === "refund_twice"} disabled={disabled} size="md" tone="yellow">
                <T tech="Refund ×2" plain="2 agents" />
              </RunButton>
              <RunButton onClick={() => press("chaos")} busy={busy === "chaos"} disabled={disabled} size="md" tone="black">
                <T tech="Chaos ×6" plain="Chaos" />
              </RunButton>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech="Every button hits both payments at once. Refund ×2: two parallel refunds. Chaos: six random actions in parallel, the same six on both."
                plain="Every button presses on both shops at once. 2 agents: two people click Refund in the same second. Chaos: six random buttons at once."
              />
            </span>
            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
                {limited
                  ? `Limit reached · back at ${resetClock ?? "the top of the hour"}`
                  : `${remaining ?? moneyLimits.smActionsPerHour} of ${moneyLimits.smActionsPerHour} clicks left this hour`}
              </span>
              <button
                type="button"
                onClick={reset}
                disabled={!session || busy !== null || limited}
                className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] underline decoration-2 underline-offset-4 hover:bg-brutal-yellow disabled:opacity-40"
              >
                ↺ <T tech="New payment" plain="Start over" />
              </button>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto] gap-10 lg:gap-x-8 lg:gap-y-5">
          {(["naive", "guarded"] as const).map((impl) => {
            const p = payments[impl];
            const bad = impl === "naive";
            const x = s[impl];
            const over = x.refunded > x.paid;
            const hist = rows[impl].slice(-LOG_ROWS).reverse();
            return (
              <div key={impl} className="flex flex-col gap-5 lg:row-span-4 lg:grid lg:grid-rows-subgrid">
                <ImplHeader
                  kind={bad ? "bad" : "good"}
                  title={bad ? "Status column" : "Transition table + version"}
                  note={bad ? "UPDATE payments SET state = $new WHERE id = $1" : "UPDATE … WHERE id = $1 AND state = ANY($from) AND version = $v"}
                  plainTitle={bad ? "Careless: one status field" : "Careful: rulebook + counter"}
                  plainNote={bad ? "Writes whatever you press. Never asks." : "Asks two things first: is this move allowed now? Did anyone change it since I looked?"}
                />
                <Diagram state={p?.state ?? "created"} broken={over} rows={rows[impl]} plain={plain} />

                <div className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr] gap-3 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
                  <Box label={<T tech="state" plain="Now" />} value={p ? (plain ? sp(p.state) : p.state) : "—"} />
                  <Box
                    label={<T tech="refunded" plain="Sent back" />}
                    value={money(x.refunded)}
                    sub={<T tech={`captured ${money(x.paid)}`} plain={`${money(x.paid)} was paid`} />}
                    tone={over ? "bad" : "neutral"}
                  />
                  {bad ? (
                    <Box label={<T tech="bad writes" plain="Rules broken" />} value={String(x.breaks)} tone={x.breaks ? "bad" : "neutral"} />
                  ) : (
                    <Box label={<T tech="refused" plain="Said no" />} value={String(x.refused)} tone={x.refused ? "warn" : "neutral"} />
                  )}
                </div>

                <ol className="flex flex-col border-[3px] border-brutal-black bg-cream" aria-label="Last moves">
                  {Array.from({ length: LOG_ROWS }, (_, i) => {
                    const r = hist[i];
                    if (!r)
                      return (
                        <li key={i} className="h-11 sm:h-8 px-3 flex items-center border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] opacity-30">
                          {i === 0 ? <T tech="no transitions yet" plain="Nothing pressed yet" /> : ""}
                        </li>
                      );
                    const l = line(r, plain);
                    return (
                      <li key={r.id} className="h-11 sm:h-8 px-3 flex items-center gap-2.5 border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] min-w-0">
                        <span className={`w-2.5 h-2.5 shrink-0 border-[2px] border-brutal-black ${dot[l.tone]}`} aria-hidden="true" />
                        <span className={`min-w-0 leading-tight line-clamp-2 sm:line-clamp-1 ${l.tone === "bad" ? "font-bold" : ""}`}>{l.text}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </Stage>

      <Note tone={error ? "bad" : lost > 0 ? "bad" : "neutral"}>
        {error === "limit" ? (
          <T
            tech={`Rate limit: ${moneyLimits.smActionsPerHour} clicks per hour per visitor, all used. Resets at ${resetClock ?? "the top of the hour"}.`}
            plain={`You have used all ${moneyLimits.smActionsPerHour} clicks for this hour. More at ${resetClock ?? "the top of the hour"}. The limit keeps the demo database alive for everyone.`}
          />
        ) : error ? (
          error
        ) : s.naive.clicks === 0 ? (
          <T
            tech="Two payments of $49, both created. Every button hits both. Try to make the status column refund money it never captured."
            plain="Two shops, the same $49 payment, nothing pressed yet. Every button presses on both. Your goal: make the careless shop send back money it never took."
          />
        ) : plain ? (
          <>
            {lost > 0 ? `The careless shop sent back ${money(lost)} it never took. ` : ""}
            Same {s.naive.clicks} {s.naive.clicks === 1 ? "click" : "clicks"} on both. The careless shop ended up {sp(payments.naive?.state)} and broke {s.naive.breaks}{" "}
            {s.naive.breaks === 1 ? "rule" : "rules"}. The careful one ended up {sp(payments.guarded?.state)} and said no {s.guarded.refused}{" "}
            {s.guarded.refused === 1 ? "time" : "times"}.
          </>
        ) : (
          <>
            naive: state={payments.naive?.state}, refunded {money(s.naive.refunded)} of {money(s.naive.paid)} captured, {s.naive.breaks} illegal or stale writes applied. guarded:
            state={payments.guarded?.state}, refunded {money(s.guarded.refunded)}, {s.guarded.refused} refused ({s.guarded.illegal} illegal, {s.guarded.stale} stale version
            {s.guarded.check ? `, ${s.guarded.check} CHECK` : ""}).
          </>
        )}
      </Note>

      <DbRows>
        <RawRows<TransitionRow>
          title="sm.transitions — every attempt, both sides"
          rows={log.slice(0, 40)}
          empty="No transitions yet."
          columns={[
            { key: "at", label: "At", render: (r) => new Date(r.at).toISOString().slice(11, 23) },
            { key: "impl", label: "Side" },
            { key: "action", label: "Action" },
            { key: "from_state", label: "From" },
            { key: "to_state", label: "To", render: (r) => r.to_state ?? "—" },
            {
              key: "ok",
              label: "Result",
              render: (r) => <span className={r.ok ? (r.reason ? "text-brutal-coral" : "text-[#4ade80]") : "text-brutal-yellow"}>{r.ok ? "applied" : "refused"}</span>,
            },
            { key: "reason", label: "Reason", render: (r) => r.reason ?? "" },
          ]}
        />
      </DbRows>

      <Limits>Limit: {moneyLimits.smActionsPerHour} clicks per hour per visitor. Payments older than 24 hours are deleted with their transitions.</Limits>
    </div>
  );
}

function Box({ label, value, sub, tone = "neutral" }: { label: React.ReactNode; value: string; sub?: React.ReactNode; tone?: "neutral" | "bad" | "warn" }) {
  const cls = tone === "bad" ? "bg-[#FF5CAA]" : tone === "warn" ? "bg-brutal-yellow" : "bg-white";
  return (
    <div className={`h-[6rem] border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] px-3 py-2.5 flex flex-col gap-1 min-w-0 ${cls}`}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-70 truncate">{label}</span>
      <span className="font-display font-black text-2xl leading-none tracking-[-0.03em] tabular-nums truncate">{value}</span>
      {sub && <span className="mt-auto font-mono text-[10px] leading-tight opacity-70 truncate">{sub}</span>}
    </div>
  );
}

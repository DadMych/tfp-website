"use client";

import { useCallback, useEffect, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { formatCents, moneyLimits } from "@/lib/money-lab";
import { ImplHeader, Limits, Note, RawRows, RunButton, Stage } from "./ui";
import { DbRows, T, useExplain } from "./Explain";

type Action = "topup" | "pay" | "refund" | "chaos" | "unbalanced";
type Impl = "naive" | "ledger";

interface Side {
  cash: number;
  wallet: number;
  revenue: number;
  drift: number;
}
interface JournalRow extends Record<string, unknown> {
  tx_id: string;
  memo: string;
  legs: string;
  created_at: string;
}
interface OpRow extends Record<string, unknown> {
  id: number;
  impl: Impl;
  memo: string;
  outcome: "applied" | "crashed" | "rolled_back" | "refused";
  at: string;
}
interface State {
  initialized: boolean;
  naive: Side;
  ledger: Side & { sum: number; entries: number };
  journal: JournalRow[];
  ops: OpRow[];
}

const ACTIONS: { id: Action; label: string; plain: string }[] = [
  { id: "topup", label: "Top up $100", plain: "Add $100" },
  { id: "pay", label: "Pay $30", plain: "Pay $30" },
  { id: "refund", label: "Refund $30", plain: "Refund $30" },
];

const OUTCOME_CLS: Record<OpRow["outcome"], string> = {
  applied: "text-[#4ade80]",
  crashed: "text-brutal-coral",
  rolled_back: "text-brutal-yellow",
  refused: "text-brutal-yellow",
};

const money = (c: number) => formatCents(c).replace(/\.00$/, "");

/** lg.ops memos look like "pay for ticket 3000". */
const MEMO_PLAIN: Record<string, string> = {
  "top up": "Add",
  "pay for ticket": "Pay",
  "refund ticket": "Refund",
  "chaos transfer": "Move",
  "one-legged entry": "Half a move",
};
function parseMemo(memo: string) {
  const m = memo.match(/^(.*) (-?\d+)$/);
  return m ? { name: m[1], cents: Number(m[2]) } : { name: memo, cents: 0 };
}

/** Newest first. A run of the same memo (a chaos batch) collapses into one line per outcome, failures first. */
function groups(ops: OpRow[]): { r: OpRow; n: number }[] {
  const out: { r: OpRow; n: number }[] = [];
  for (let i = 0; i < ops.length; ) {
    let j = i;
    while (j < ops.length && ops[j].memo === ops[i].memo) j++;
    const run = ops.slice(i, j);
    const by = new Map<string, { r: OpRow; n: number }>();
    for (const r of run) {
      const g = by.get(r.outcome);
      if (g) g.n++;
      else by.set(r.outcome, { r, n: 1 });
    }
    out.push(...[...by.values()].sort((a, b) => Number(a.r.outcome === "applied") - Number(b.r.outcome === "applied")));
    i = j;
  }
  return out;
}

function line(r: OpRow, n: number, plain: boolean): { text: string; tone: "ok" | "bad" | "no" } {
  const { name, cents } = parseMemo(r.memo);
  const what = `${plain ? (MEMO_PLAIN[name] ?? name) : name} ${money(cents)}${n > 1 ? ` ×${n}` : ""}`;
  if (r.impl === "naive") {
    if (r.outcome === "crashed")
      return { text: plain ? `${what}: crashed after the first number. Half a move.` : `${what}: died after UPDATE #1, UPDATE #2 never ran`, tone: "bad" };
    return { text: plain ? `${what}: both numbers changed.` : `${what}: 2 UPDATEs, no transaction`, tone: "ok" };
  }
  if (r.outcome === "refused") return { text: plain ? `${what}: the database said no.` : `${what}: refused at COMMIT by lg_tx_balanced`, tone: "no" };
  if (r.outcome === "rolled_back") return { text: plain ? `${what}: crashed, undone whole.` : `${what}: ROLLBACK, 0 entries kept`, tone: "no" };
  return { text: plain ? `${what}: two lines, saved together.` : `${what}: COMMIT, 2 entries`, tone: "ok" };
}

const LOG_ROWS = 5;
const dot = { ok: "bg-[#C6FF3D]", bad: "bg-[#FF0000]", no: "bg-brutal-yellow" } as const;
const ZERO: Side = { cash: 0, wallet: 0, revenue: 0, drift: 0 };

/** The book as one equation: bank = owed + earned. */
function Equation({ s, ready }: { s: Side; ready: boolean }) {
  // Phones: a column, the operator leads each row. sm+: one line, operators between the boxes.
  const cell = (label: React.ReactNode, v: number, op?: string) => (
    <div className="h-12 sm:h-[5.5rem] border-[3px] border-brutal-black bg-white shadow-[4px_4px_0_0_#000] px-3 sm:py-2.5 flex flex-row sm:flex-col items-center sm:items-stretch justify-between sm:justify-start gap-1 min-w-0">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-70 truncate">
        {op && <span className="sm:hidden">{op} </span>}
        {label}
      </span>
      <span className="font-display font-black text-xl sm:text-2xl leading-none tracking-[-0.03em] tabular-nums truncate">{ready ? money(v) : "—"}</span>
    </div>
  );
  const sym = (c: string) => (
    <span className="hidden sm:block font-display font-black text-3xl leading-none" aria-hidden="true">
      {c}
    </span>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center gap-2 sm:gap-2.5">
      {cell(<T tech="cash" plain="In the bank" />, s.cash)}
      {sym("=")}
      {cell(<T tech="wallet" plain="Owed" />, s.wallet, "=")}
      {sym("+")}
      {cell(<T tech="revenue" plain="Earned" />, s.revenue, "+")}
    </div>
  );
}

export default function LedgerDemo() {
  const session = useLabSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ plain: string; tech: string } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const { plain } = useExplain();

  const refresh = useCallback(async () => {
    if (!session) return null;
    const s = await labGet<State>("/api/lab/money/ledger/state", session);
    setState(s);
    return s;
  }, [session]);

  const loadLimit = useCallback(() => {
    labGet<{ remaining: number; resetAt: number }>("/api/lab/money/ledger/act", session)
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
    setLast(null);
    try {
      const r = await labPost<{ remaining: number }>("/api/lab/money/ledger/act", session, { action: "reset" });
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
      .then((s) => {
        if (s && !s.initialized) void reset();
      })
      .catch(() => void reset());
  }, [session, refresh, reset, loadLimit]);

  async function act(a: Action) {
    setBusy(a);
    setError(null);
    try {
      const out = await labPost<{ result: unknown; remaining: number }>("/api/lab/money/ledger/act", session, { action: a });
      setRemaining(out.remaining);
      const r = out.result as Record<string, unknown>;
      if (a === "chaos") {
        const n = r.naive as { applied: number; crashed: number };
        const l = r.ledger as { applied: number; rolled_back: number };
        setLast({
          plain: `20 payments of $5, every 4th crashed halfway. Simple book: ${n.applied} done, ${n.crashed} half-done. Accountant's book: ${l.applied} saved, ${l.rolled_back} undone whole.`,
          tech: `Chaos: naive ${n.applied} applied, ${n.crashed} died between the UPDATEs. Ledger ${l.applied} committed, ${l.rolled_back} rolled back whole.`,
        });
      } else if (a === "unbalanced") {
        const u = r as { outcome: string; error: string | null };
        setLast(
          u.outcome === "refused"
            ? { plain: "You tried to save half a move. The database refused it.", tech: `One leg posted, refused at COMMIT: ${u.error}` }
            : { plain: "Half a move was saved. That should not have happened.", tech: "One-legged entry committed. The trigger is missing." }
        );
      } else {
        setLast(null);
      }
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  const n = state?.naive ?? ZERO;
  const l = state?.ledger ?? { ...ZERO, sum: 0, entries: 0 };
  const ready = Boolean(state);
  const ops = state?.ops ?? [];
  const pressed = ops.length > 0;
  const limited = remaining === 0;
  const resetClock = resetAt ? new Date(resetAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const disabled = !state?.initialized || busy !== null || limited;

  const drift = (s: Side) =>
    s.drift === 0 ? null : s.drift > 0 ? { plain: `${money(s.drift)} in the bank belongs to nobody`, tech: `cash exceeds wallet + revenue by ${money(s.drift)}` } : { plain: `${money(-s.drift)} is promised and not in the bank`, tech: `wallet + revenue exceed cash by ${money(-s.drift)}` };

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        {/* controls: one set of buttons, both books get every move */}
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            <div className="grid grid-cols-3 gap-3 [&_button]:w-full [&_button]:px-1 sm:[&_button]:px-2 [&_button]:text-xs sm:[&_button]:text-base">
              {ACTIONS.map((a) => (
                <RunButton key={a.id} onClick={() => act(a.id)} busy={busy === a.id} disabled={disabled} size="md" tone="white">
                  <T tech={a.label} plain={a.plain} />
                </RunButton>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 [&_button]:w-full [&_button]:px-2 lg:w-[22rem]">
              <RunButton onClick={() => act("chaos")} busy={busy === "chaos"} disabled={disabled} size="md" tone="yellow">
                <T tech="Chaos ×20" plain="Crash ×20" />
              </RunButton>
              <RunButton onClick={() => act("unbalanced")} busy={busy === "unbalanced"} disabled={disabled} size="md" tone="black">
                <T tech="Post one leg" plain="Half a move" />
              </RunButton>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech="Every button runs on both sides. Chaos: 20 × $5 in parallel, every 4th dies between its two writes. Post one leg: ledger only, a single entry, then COMMIT."
                plain="Every button moves the same money in both books. Crash ×20: twenty $5 payments, every 4th dies halfway. Half a move: tries to sneak a one-sided line into the accountant's book."
              />
            </span>
            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
                {limited
                  ? `Limit reached · back at ${resetClock ?? "the top of the hour"}`
                  : `${remaining ?? moneyLimits.lgActionsPerHour} of ${moneyLimits.lgActionsPerHour} clicks left this hour`}
              </span>
              <button
                type="button"
                onClick={reset}
                disabled={!session || busy !== null || limited}
                className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] underline decoration-2 underline-offset-4 hover:bg-brutal-yellow disabled:opacity-40"
              >
                ↺ <T tech="Reset both books" plain="Start over" />
              </button>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto] gap-10 lg:gap-x-8 lg:gap-y-5">
          {(["naive", "ledger"] as const).map((impl) => {
            const bad = impl === "naive";
            const s = bad ? n : l;
            const off = drift(s);
            const hist = groups(ops.filter((o) => o.impl === impl)).slice(0, LOG_ROWS);
            return (
              <div key={impl} className="flex flex-col gap-5 lg:row-span-4 lg:grid lg:grid-rows-subgrid">
                <ImplHeader
                  kind={bad ? "bad" : "good"}
                  title={bad ? "Balances table" : "Double-entry ledger"}
                  note={bad ? "UPDATE balances SET amount = amount − x … then UPDATE the other row" : "INSERT two entries in one transaction; a deferred trigger refuses SUM ≠ 0"}
                  plainTitle={bad ? "Simple book: one number each" : "Accountant's book: two lines"}
                  plainNote={bad ? "Change one number, then the other. Two separate steps." : "Every move is two matching lines, saved together or not at all."}
                />

                <Equation s={s} ready={ready} />

                <div
                  className={`h-[5.25rem] border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] px-4 flex flex-col justify-center gap-1 min-w-0 ${off ? "bg-[#FF5CAA]" : "bg-[#C6FF3D]"}`}
                >
                  <span className="font-display font-black text-base sm:text-lg leading-tight truncate">
                    {!ready ? "—" : off ? <T tech={`Off by ${money(Math.abs(s.drift))}`} plain={`Doesn't add up: off by ${money(Math.abs(s.drift))}`} /> : <T tech="Balanced" plain="Adds up" />}
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] leading-tight opacity-75 line-clamp-2">
                    {off ? (
                      <T tech={`${off.tech}. No row says which transfer.`} plain={`${off.plain}. Nothing here says which move did it.`} />
                    ) : bad ? (
                      <T tech="Nothing has died between the two UPDATEs yet." plain="Nothing has crashed halfway yet." />
                    ) : (
                      <T tech={`SUM(entries) over ${l.entries} rows = ${l.sum}`} plain={`${l.entries} lines so far, and they add up to ${money(l.sum)}`} />
                    )}
                  </span>
                </div>

                <ol className="flex flex-col border-[3px] border-brutal-black bg-cream" aria-label="Last moves">
                  {Array.from({ length: LOG_ROWS }, (_, i) => {
                    const g = hist[i];
                    if (!g)
                      return (
                        <li key={i} className="h-11 sm:h-8 px-3 flex items-center border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] opacity-30">
                          {i === 0 ? <T tech="no operations yet" plain="Nothing pressed yet" /> : ""}
                        </li>
                      );
                    const ln = line(g.r, g.n, plain);
                    return (
                      <li key={g.r.id} className="h-11 sm:h-8 px-3 flex items-center gap-2.5 border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] min-w-0">
                        <span className={`w-2.5 h-2.5 shrink-0 border-[2px] border-brutal-black ${dot[ln.tone]}`} aria-hidden="true" />
                        <span className={`min-w-0 leading-tight line-clamp-2 sm:line-clamp-1 ${ln.tone === "bad" ? "font-bold" : ""}`}>{ln.text}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </Stage>

      <Note tone={error ? "bad" : n.drift !== 0 ? "bad" : "neutral"}>
        {error === "limit" ? (
          <T
            tech={`Rate limit: ${moneyLimits.lgActionsPerHour} clicks per hour per visitor, all used. Resets at ${resetClock ?? "the top of the hour"}.`}
            plain={`You have used all ${moneyLimits.lgActionsPerHour} clicks for this hour. More at ${resetClock ?? "the top of the hour"}. The limit keeps the demo database alive for everyone.`}
          />
        ) : error ? (
          error
        ) : !pressed ? (
          <T
            tech="Three accounts, two books, both empty. Every button hits both. Try to make the balances table disagree with itself."
            plain="Three accounts, two books, both empty. Every button moves the same money in both. Your goal: make the simple book stop adding up."
          />
        ) : (
          <>
            {last ? (plain ? last.plain : last.tech) + " " : ""}
            {n.drift !== 0 ? (
              <T
                tech={`Balances table off by ${money(Math.abs(n.drift))}; ledger balanced, ${l.entries} entries summing to ${l.sum}.`}
                plain={`The simple book is off by ${money(Math.abs(n.drift))}. The accountant's book still adds up.`}
              />
            ) : (
              <T tech="Both sides balanced. Nothing has died between two writes yet." plain="Both books add up. Nothing has crashed halfway yet." />
            )}
          </>
        )}
      </Note>

      <DbRows>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RawRows<OpRow>
            title="lg.ops — what each side did"
            rows={ops.slice(0, 40)}
            empty="No operations yet."
            columns={[
              { key: "at", label: "At", render: (r) => new Date(r.at).toISOString().slice(11, 23) },
              { key: "impl", label: "Side" },
              { key: "memo", label: "Op" },
              { key: "outcome", label: "Outcome", render: (r) => <span className={OUTCOME_CLS[r.outcome]}>{r.outcome.replace("_", " ")}</span> },
            ]}
          />
          <RawRows<JournalRow>
            title="lg.journal JOIN lg.entries — committed transactions"
            rows={state?.journal ?? []}
            empty="No committed transactions yet."
            columns={[
              { key: "created_at", label: "At", render: (r) => new Date(r.created_at).toISOString().slice(11, 23) },
              { key: "memo", label: "Memo" },
              { key: "legs", label: "Legs (cents)" },
            ]}
          />
        </div>
      </DbRows>

      <Limits>
        <T tech={`Limit: ${moneyLimits.lgActionsPerHour} clicks per hour per visitor. Journal rows older than 24 hours are deleted with their entries.`} plain={`${moneyLimits.lgActionsPerHour} clicks an hour each. Everything is wiped after a day.`} />
      </Limits>
    </div>
  );
}

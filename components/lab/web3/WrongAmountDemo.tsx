"use client";

import { useCallback, useEffect, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { web3Limits, wrongAmount, type WrongAmountScenario } from "@/lib/web3-lab";
import { ImplHeader, Limits, Note, Stage } from "../money/ui";
import { T } from "../money/Explain";

interface State {
  tip: number;
  invoice: null | { label: string; scenario: WrongAmountScenario; units: number };
  deposits: { txHash: string; units: number; height: number | null; confirmations: number; settled: boolean }[];
  careless: null | { paid: boolean; received: number; recorded: number; unaccounted: number };
  careful: null | { state: "unpaid" | "partly" | "paid" | "overpaid"; received: number; due: number; credit: number };
  remaining: number;
  funded: boolean;
}

const URL = "/api/lab/web3/wrong-amount";
const N = wrongAmount.needed;
const due = wrongAmount.invoice.units;
const fmt = (n: number) => n.toLocaleString("en-US");
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

function Cells({ cells }: { cells: { label: React.ReactNode; value: string; bad?: boolean }[] }) {
  return (
    <div className="grid grid-cols-3 border-t-[3px] border-brutal-black divide-x-[3px] divide-brutal-black">
      {cells.map((c, i) => (
        <div key={i} className={`h-[4.25rem] px-2 sm:px-3 flex flex-col justify-center gap-1 min-w-0 ${c.bad ? "bg-[#FF5CAA]" : ""}`}>
          <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] opacity-70 line-clamp-2 leading-tight">{c.label}</span>
          <span className="font-display font-black text-base sm:text-xl leading-none tabular-nums truncate">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function WrongAmountDemo() {
  const session = useLabSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<WrongAmountScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      setState(await labGet<State>(URL, session));
    } catch (e) {
      setError(e instanceof LabRequestError ? e.message : "couldn't reach the chain");
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4_000);
    return () => clearInterval(id);
  }, [session, refresh]);

  async function payWith(scenario: WrongAmountScenario) {
    setBusy(scenario);
    setError(null);
    try {
      await labPost(URL, session, { scenario });
      await refresh();
    } catch (e) {
      setError(e instanceof LabRequestError ? e.message : "request failed");
    } finally {
      setBusy(null);
    }
  }

  const inv = state?.invoice ?? null;
  const deps = state?.deposits ?? [];
  const scenario = wrongAmount.scenarios.find((s) => s.id === inv?.scenario);
  const settling = deps.some((d) => !d.settled);
  const limited = state?.remaining === 0;
  const canPay = Boolean(state?.funded) && !limited && !settling && busy === null;
  const c = state?.careless ?? null;
  const k = state?.careful ?? null;
  const done = Boolean(inv) && deps.length > 0 && !settling;

  const carelessHead = !c ? (
    "—"
  ) : c.paid ? (
    <T tech="Invoice: paid" plain="Marked paid" />
  ) : c.received > 0 ? (
    <T tech="Invoice: unpaid" plain="Still says unpaid" />
  ) : (
    <T tech={`Waiting for ${N} blocks`} plain="Waiting" />
  );
  const carefulHead = !k ? (
    "—"
  ) : k.state === "paid" ? (
    <T tech="Paid in full" plain="Paid in full" />
  ) : k.state === "partly" ? (
    <T tech={`Partly paid · ${fmt(k.due)} due`} plain={`${fmt(k.due)} still to pay`} />
  ) : k.state === "overpaid" ? (
    <T tech={`Overpaid · ${fmt(k.credit)} owed back`} plain={`Paid ${fmt(k.credit)} too much: owed back`} />
  ) : (
    <T tech={`Waiting for ${N} blocks`} plain="Waiting" />
  );

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="font-display font-black text-2xl md:text-3xl tracking-[-0.03em] tabular-nums">
              {wrongAmount.invoice.label} · {fmt(due)} USDC
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-60">
              <T tech="Invoice due · pick how the client pays it" plain="The bill · pick how the client pays" />
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {wrongAmount.scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => payWith(s.id)}
                disabled={!canPay}
                aria-pressed={inv?.scenario === s.id}
                className={`relative h-[4.5rem] border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] px-3 flex flex-col justify-center items-start gap-1 text-left min-w-0 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow] duration-100 disabled:cursor-not-allowed ${
                  inv?.scenario === s.id ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow disabled:opacity-60 disabled:hover:bg-white"
                }`}
              >
                {busy === s.id && <span className="pulse-dot absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-current" aria-hidden="true" />}
                <span className="font-display font-black uppercase text-sm sm:text-base leading-none truncate max-w-full">{s.label}</span>
                <span className="font-mono text-[11px] tabular-nums opacity-75 truncate max-w-full">{s.parts.map(fmt).join(" + ")}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech={`Real USDC transfers on Sepolia, 1 test unit per story USDC (0.0058 test USDC for the invoice). Both sides wait ${N} blocks: this page is about amounts.`}
                plain="Real payments on a test network, in test money worth nothing. Both checkers wait a few blocks, so this page is only about the amounts."
              />
            </span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
              {state && !state.funded ? "Lab wallet empty" : `${state?.remaining ?? web3Limits.paysPerHour} of ${web3Limits.paysPerHour} payments left this hour`}
            </span>
          </div>
        </div>

        <ol className="flex flex-col border-[3px] border-brutal-black bg-cream" aria-label="Deposits">
          {[0, 1].map((i) => {
            const d = deps[i];
            return (
              <li key={i} className="h-11 px-3 flex items-center gap-3 border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] min-w-0">
                {!d ? (
                  <span className="opacity-30">{i === 0 ? (busy ? <T tech="sending…" plain="Sending…" /> : <T tech="no deposits yet" plain="No payments yet" />) : ""}</span>
                ) : (
                  <>
                    <span className={`w-2.5 h-2.5 shrink-0 border-[2px] border-brutal-black ${d.settled ? "bg-[#C6FF3D]" : "bg-white"}`} aria-hidden="true" />
                    <span className="font-bold tabular-nums w-[5.5rem] shrink-0">{fmt(d.units)} USDC</span>
                    <span className="opacity-70 truncate flex-1 min-w-0">
                      {d.settled ? (
                        <T tech={<>settled<span className="hidden sm:inline"> · block #{d.height}</span></>} plain="Arrived" />
                      ) : d.height == null ? (
                        <T tech="waiting for a block" plain="On its way" />
                      ) : (
                        <T tech={`${d.confirmations} of ${N} blocks`} plain={`${d.confirmations} of ${N} blocks`} />
                      )}
                    </span>
                    <a href={`https://sepolia.etherscan.io/tx/${d.txHash}`} target="_blank" rel="noreferrer" className="hidden sm:inline shrink-0 underline underline-offset-2 hover:bg-brutal-yellow">
                      {short(d.txHash)} ↗
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ol>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8">
          <div className="flex flex-col gap-4">
            <ImplHeader
              kind="bad"
              title="Match by amount"
              note="deposits.find(d => d.amount >= invoice.amount) → markPaid()"
              plainTitle="Looks for the right number"
              plainNote="Looks for one payment of at least the invoice amount. Anything else is ignored."
            />
            <div className={`border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] ${c && c.unaccounted > 0 && done ? "bg-[#FF5CAA]/30" : "bg-white"}`}>
              <div className="h-14 px-4 flex items-center font-display font-black text-lg sm:text-xl leading-tight truncate">{carelessHead}</div>
              <Cells
                cells={[
                  { label: <T tech="Received" plain="Arrived" />, value: c ? fmt(c.received) : "—" },
                  { label: <T tech="Recorded" plain="In the books" />, value: c ? fmt(c.recorded) : "—" },
                  { label: <T tech="On no invoice" plain="Lost in the books" />, value: c ? fmt(c.unaccounted) : "—", bad: Boolean(c && c.unaccounted > 0) },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <ImplHeader
              kind="good"
              title="Ledger per invoice"
              note="each deposit → a line on its invoice; state = SUM(lines) vs amount due"
              plainTitle="Writes down every payment"
              plainNote="Every payment becomes a line on the invoice. The status is what the lines add up to."
            />
            <div className={`border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] ${k?.state === "paid" ? "bg-[#C6FF3D]" : k && k.state !== "unpaid" ? "bg-brutal-yellow" : "bg-white"}`}>
              <div className="h-14 px-4 flex items-center font-display font-black text-lg sm:text-xl leading-tight truncate">{carefulHead}</div>
              <Cells
                cells={[
                  { label: <T tech="Received" plain="Arrived" />, value: k ? fmt(k.received) : "—" },
                  { label: <T tech="Recorded" plain="In the books" />, value: k ? fmt(k.received) : "—" },
                  { label: <T tech="On no invoice" plain="Lost in the books" />, value: k ? "0" : "—" },
                ]}
              />
            </div>
          </div>
        </div>
      </Stage>

      <Note tone={error ? "bad" : done && c && c.unaccounted > 0 ? "bad" : "neutral"}>
        {error ? (
          error
        ) : !inv || !scenario ? (
          <T
            tech={`Pick how the client pays ${wrongAmount.invoice.label}. Each button is a new invoice and real transfers. Watch what each side books once they settle.`}
            plain="Pick how the client pays. Each button sends real test payments. Then compare what each checker wrote down."
          />
        ) : !done ? (
          <>
            {scenario.why}{" "}
            <T tech={`Waiting for ${N} blocks on each transfer.`} plain="Waiting for the payment to settle." />
          </>
        ) : c && c.unaccounted > 0 ? (
          <>
            {scenario.why}{" "}
            <T
              tech={`${fmt(c.unaccounted)} USDC arrived and sits on no invoice. ${c.paid ? "The client overpaid and nobody knows to pay it back." : "The invoice says unpaid: the client gets a reminder for money they sent."} The ledger has every line.`}
              plain={`${fmt(c.unaccounted)} arrived and isn't in the books. ${c.paid ? "Nobody knows the client is owed money back." : "The client gets a reminder to pay money they already sent."} The careful side wrote every payment down.`}
            />
          </>
        ) : (
          <>
            {scenario.why} <T tech="Both sides agree. Try a messier payment." plain="Both checkers agree. Try a messier payment." />
          </>
        )}
      </Note>

      <Limits>
        <T
          tech={`Limit: ${web3Limits.paysPerHour} payments per hour per visitor, ${web3Limits.paysPerDay} transfers a day for everyone: each one spends real Sepolia gas from one lab wallet.`}
          plain={`${web3Limits.paysPerHour} payments an hour each. Every payment is real and uses up the lab's test money.`}
        />
      </Limits>
    </div>
  );
}

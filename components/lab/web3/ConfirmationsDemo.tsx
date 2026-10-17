"use client";

import { useCallback, useEffect, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { invoice, web3Limits } from "@/lib/web3-lab";
import { ImplHeader, Limits, Note, RunButton, Stage } from "../money/ui";
import { T } from "../money/Explain";

interface Block {
  height: number;
  hash: string;
  parent: string;
  sim?: boolean;
  deposit: boolean;
}
interface Deposit {
  invoice: string;
  txHash: string | null;
  truth: "pending" | "in" | "gone";
  height: number | null;
  confirmations: number;
  needed: number;
  careless: { paidAt: number | null; lost: boolean };
  careful: { paidAt: number | null; caughtAt: number | null; lost: boolean };
  reorg: { tip: number; depth: number } | null;
}
interface State {
  tip: number;
  blocks: Block[];
  deposit: Deposit | null;
  remaining: number;
  funded: boolean;
}

const URL = "/api/lab/web3/confirmations";
const SHOWN = 10;
const CHOICES = [1, 3, 6, 12] as const;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const usdc = (n: number) => `${n.toLocaleString("en-US")} USDC`;
const story = usdc(invoice.storyUsdc);

type Tone = "wait" | "paid" | "bad" | "held" | "idle";
const TONE: Record<Tone, string> = {
  idle: "bg-cream",
  wait: "bg-white",
  paid: "bg-[#C6FF3D]",
  bad: "bg-[#FF5CAA]",
  held: "bg-brutal-yellow",
};

function careless(d: Deposit | null): { tone: Tone; head: React.ReactNode; sub: React.ReactNode } {
  if (!d) return { tone: "idle", head: "—", sub: <T tech="Waiting for a deposit." plain="Nothing paid yet." /> };
  if (d.careless.lost)
    return {
      tone: "bad",
      head: <T tech={`Paid, then gone: −${story}`} plain={`Paid, then vanished: −${story}`} />,
      sub: <T tech={`Marked paid at block ${d.careless.paidAt}. The block is gone; the work already went out.`} plain="It said 'paid' and the work went out. The payment no longer exists." />,
    };
  if (d.careless.paidAt != null)
    return {
      tone: "paid",
      head: <T tech={`Paid at block ${d.careless.paidAt}`} plain="Paid. Work sent." />,
      sub: <T tech="1 confirmation was enough for it. It never looks again." plain="It saw the payment once and moved on. It won't check again." />,
    };
  if (d.truth === "gone") return { tone: "held", head: <T tech="Never saw it" plain="Never saw it" />, sub: <T tech="The deposit was gone before it looked." plain="The payment vanished before it looked." /> };
  return { tone: "wait", head: <T tech="Waiting for a block" plain="Waiting" />, sub: <T tech="The transfer is sent, not yet in a block." plain="The payment is on its way." /> };
}

function careful(d: Deposit | null): { tone: Tone; head: React.ReactNode; sub: React.ReactNode } {
  if (!d) return { tone: "idle", head: "—", sub: <T tech="Waiting for a deposit." plain="Nothing paid yet." /> };
  if (d.careful.caughtAt != null)
    return {
      tone: "held",
      head: <T tech={`Caught at block ${d.careful.caughtAt}`} plain="Noticed and stopped" />,
      sub: (
        <T
          tech={`It credited at block ${d.careful.paidAt}, then found the block it trusted replaced and reversed the credit. Wait longer and this never happens.`}
          plain="It said 'paid', then noticed the payment was gone and took it back. Waiting longer avoids even that."
        />
      ),
    };
  if (d.careful.paidAt != null)
    return {
      tone: "paid",
      head: <T tech={`Paid at block ${d.careful.paidAt}`} plain="Paid. Work sent." />,
      sub: <T tech={`${d.needed} blocks on top. It still checks the block it trusted, every look.`} plain={`It waited for ${d.needed} blocks, and it keeps checking.`} />,
    };
  if (d.truth === "gone")
    return {
      tone: "paid",
      head: <T tech="Never credited: $0 lost" plain="Never said 'paid': nothing lost" />,
      sub: <T tech={`The deposit vanished before ${d.needed} confirmations. Nothing was released.`} plain="The payment vanished before it was sure. Nothing went out." />,
    };
  return {
    tone: "wait",
    head: <T tech={`${d.confirmations} of ${d.needed} confirmations`} plain={`Waiting: ${d.confirmations} of ${d.needed} blocks`} />,
    sub: <T tech="Credits only once enough blocks sit on top." plain="It says 'paid' only once enough blocks pile on top." />,
  };
}

export default function ConfirmationsDemo() {
  const session = useLabSession();
  const [state, setState] = useState<State | null>(null);
  const [needed, setNeeded] = useState<number>(6);
  const [busy, setBusy] = useState<"pay" | "tear" | null>(null);
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

  async function act(action: "pay" | "tear") {
    setBusy(action);
    setError(null);
    try {
      await labPost(URL, session, action === "pay" ? { action, needed } : { action });
      await refresh();
    } catch (e) {
      setError(e instanceof LabRequestError ? e.message : "request failed");
    } finally {
      setBusy(null);
    }
  }

  const d = state?.deposit ?? null;
  const pending = d?.truth === "pending";
  const limited = state?.remaining === 0;
  const canPay = Boolean(state?.funded) && !limited && !pending && busy === null;
  const canTear = d?.truth === "in" && !d.reorg && d.confirmations <= web3Limits.maxTear && busy === null;
  const blocks: (Block | null)[] = state ? state.blocks.slice(-SHOWN) : [];
  while (blocks.length < SHOWN) blocks.unshift(null);
  const sides = [
    { kind: "bad" as const, title: "Credit at 1 confirmation", plainTitle: "Says 'paid' right away", note: "if (receipt) markPaid(invoice)", plainNote: "Sees the payment in a block, marks the invoice paid, done.", s: careless(d) },
    {
      kind: "good" as const,
      title: `Credit at ${d?.needed ?? needed}, keep checking`,
      plainTitle: "Waits, then keeps checking",
      note: "if (tip − height + 1 ≥ N) credit(blockHash); every look: blockAt(height) === blockHash",
      plainNote: "Waits for blocks to pile on top, remembers which block it trusted, checks it's still there.",
      s: careful(d),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-4 lg:items-center">
            <RunButton onClick={() => act("pay")} busy={busy === "pay" || pending} disabled={!canPay} size="md">
              <T tech={`Pay ${story}`} plain={`Pay ${story}`} />
            </RunButton>
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-70 shrink-0">
                <T tech="Careful waits" plain="Careful waits" />
              </span>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-1 min-w-0 max-w-[16rem]" role="radiogroup" aria-label="Blocks the careful watcher waits for">
                {CHOICES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={needed === n}
                    onClick={() => setNeeded(n)}
                    disabled={busy !== null}
                    className={`h-12 min-w-0 border-[3px] border-brutal-black font-display font-black text-base sm:text-lg tabular-nums ${needed === n ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute -top-2.5 left-3 z-10 bg-[#B79CFF] border-[2px] border-brutal-black px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em]">Simulator</span>
              <div className="[&_button]:w-full lg:w-[17rem]">
                <RunButton onClick={() => act("tear")} busy={busy === "tear"} disabled={!canTear} size="md" tone="black">
                  <T tech="Tear out its block" plain="Make it vanish" />
                </RunButton>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech={`A real USDC transfer on Sepolia: ${invoice.units.toString()} units (0.0058 test USDC) stands in for ${story}. The tear-out is simulated for your view only: Sepolia doesn't reorg on request.`}
                plain={`A real payment on a test network, in test money that is worth nothing. The vanishing is simulated, only on your screen: the real network won't do it on request.`}
              />
            </span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
              {state && !state.funded ? "Lab wallet empty" : `${state?.remaining ?? web3Limits.paysPerHour} of ${web3Limits.paysPerHour} payments left this hour`}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-70">
            <span className="truncate">
              <T tech="Sepolia · last 10" plain="Newest last" />
            </span>
            <span className="tabular-nums shrink-0">{state ? `tip #${state.tip}` : "—"}</span>
          </div>
          <ol className="grid grid-cols-5 md:grid-cols-10 gap-1.5 sm:gap-2" aria-label="Last blocks">
            {blocks.map((b, i) => (
              <li
                key={b ? b.height : `empty-${i}`}
                className={`h-16 border-[3px] border-brutal-black px-1 sm:px-1.5 flex flex-col justify-center gap-0.5 min-w-0 font-mono ${
                  !b ? "border-dashed opacity-30" : b.deposit ? "bg-brutal-yellow" : b.sim ? "bg-[#B79CFF] bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(0,0,0,0.12)_6px_8px)]" : "bg-white"
                }`}
              >
                {b && (
                  <>
                    <span className="text-[10px] sm:text-[11px] font-bold tabular-nums truncate">
                      <span className="hidden sm:inline">#</span>
                      {String(b.height).slice(-4)}
                    </span>
                    <span className="text-[9px] opacity-70 truncate">{b.deposit ? "$" : b.sim ? "fake" : b.hash.slice(2, 6)}</span>
                  </>
                )}
              </li>
            ))}
          </ol>
          <p className="h-12 sm:h-5 font-mono text-[11px] leading-snug opacity-80 line-clamp-3 sm:line-clamp-1">
            {!d ? (
              <T tech="No deposit yet. Pay the invoice and watch it land." plain="No payment yet." />
            ) : d.truth === "pending" ? (
              <T tech={`Sent ${d.txHash ? short(d.txHash) : ""}. Sepolia makes a block every 12 seconds.`} plain="Sent. A new block comes every 12 seconds or so." />
            ) : d.truth === "in" ? (
              <>
                <T tech={`In block #${d.height} · ${d.confirmations} confirmation${d.confirmations === 1 ? "" : "s"} · `} plain={`In the chain, ${d.confirmations} block${d.confirmations === 1 ? "" : "s"} deep · `} />
                {d.txHash && (
                  <a href={`https://sepolia.etherscan.io/tx/${d.txHash}`} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:bg-brutal-yellow">
                    {short(d.txHash)} ↗
                  </a>
                )}
              </>
            ) : (
              <T tech={`Block #${d.height} replaced, ${d.reorg?.depth ?? "?"} deep (simulated). The deposit is gone from your chain.`} plain="The block with your payment was replaced. The payment is gone." />
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8">
          {sides.map(({ kind, s, ...h }) => (
            <div key={kind} className="flex flex-col gap-4">
              <ImplHeader kind={kind} {...h} />
              <div className={`h-[10.5rem] sm:h-[6.5rem] border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] px-4 flex flex-col justify-center gap-1.5 min-w-0 ${TONE[s.tone]}`}>
                <span className="font-display font-black text-lg sm:text-xl leading-tight line-clamp-2 sm:line-clamp-1">{s.head}</span>
                <span className="font-mono text-[11px] leading-snug opacity-75 line-clamp-5 sm:line-clamp-2">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </Stage>

      <Note tone={error ? "bad" : d?.careless.lost ? "bad" : "neutral"}>
        {error ? (
          error
        ) : !d ? (
          <T
            tech={`Pay ${invoice.label}. Both watchers see the same chain. Pick how many blocks the careful one waits for, then tear the block out before it gets there, or after.`}
            plain="Pay the invoice. Both checkers watch the same payment. Then make it vanish and see which one already handed over the work."
          />
        ) : d.careless.lost ? (
          <T
            tech={`The careless watcher released ${story} of work against a block that no longer exists. The careful one ${d.careful.caughtAt != null ? "had credited too, and caught it" : "never credited"}.`}
            plain={`The careless checker handed over ${story} of work for a payment that no longer exists. The careful one ${d.careful.caughtAt != null ? "had said 'paid' too, but noticed" : "never said 'paid'"}.`}
          />
        ) : d.truth === "in" && d.careless.paidAt != null && d.careful.paidAt == null ? (
          <T tech="Careless already shipped. Careful is still waiting. Now is the moment to tear the block out." plain="One checker already said 'paid'. The other is still waiting. Now make the payment vanish." />
        ) : d.truth === "in" ? (
          <T tech="Both credited. Tear the block out now and see who notices." plain="Both said 'paid'. Make it vanish now and see who notices." />
        ) : (
          <T tech="Waiting for Sepolia to put the transfer in a block." plain="Waiting for the network to pick up the payment." />
        )}
      </Note>

      <Limits>
        <T
          tech={`Limit: ${web3Limits.paysPerHour} payments per hour per visitor, ${web3Limits.paysPerDay} a day for everyone: each one spends real Sepolia gas from one lab wallet.`}
          plain={`${web3Limits.paysPerHour} payments an hour each. Every payment is real and uses up the lab's test money.`}
        />
      </Limits>
    </div>
  );
}

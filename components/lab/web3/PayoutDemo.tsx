"use client";

import { useCallback, useEffect, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { payout, web3Limits } from "@/lib/web3-lab";
import { ImplHeader, Limits, Note, RunButton, Stage } from "../money/ui";
import { T } from "../money/Explain";

type Side = "careless" | "careful";
interface Attempt {
  side: Side;
  attempt: number;
  nonce: number;
  recorded: string;
  nodeSaid: string | null;
  txHash: string;
  landed: boolean;
}
interface State {
  tip: number;
  freelancer: string;
  attempts: Attempt[];
  received: Record<Side, number>;
  settling: boolean;
  remaining: number;
  funded: boolean;
}

const URL = "/api/lab/web3/payout";
const fmt = (n: number) => `${n.toLocaleString("en-US")} USDC`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

/** What the app believes, in plain words. Keys are the server's `recorded` strings. */
const PLAIN: Record<string, string> = {
  "stored the signed tx, sent it · reply lost": "Saved the payment, sent it. No reply.",
  "retry: sent the same stored tx": "Sent the saved payment again.",
  "sent · reply lost, marked failed": "Sent it. No reply, so it thinks it failed.",
  "retry: built a new tx, sent": "Made a new payment and sent it.",
};

function AttemptRow({ a, n }: { a: Attempt | undefined; n: number }) {
  return (
    <li className="h-[4.5rem] px-3 flex items-center gap-3 border-b-[2px] border-brutal-black/10 last:border-b-0 min-w-0">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-60 w-6 shrink-0">#{n}</span>
      {!a ? (
        <span className="font-mono text-[11px] opacity-30">—</span>
      ) : (
        <span className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="font-mono text-[11px] font-bold leading-tight line-clamp-2">
            <T tech={a.recorded} plain={PLAIN[a.recorded] ?? a.recorded} />
          </span>
          <span className="flex items-center gap-2 font-mono text-[10px] opacity-70 min-w-0">
            <span className={`w-2 h-2 shrink-0 border-[2px] border-brutal-black ${a.landed ? "bg-[#C6FF3D]" : "bg-white"}`} aria-hidden="true" />
            <span className="truncate">
              <T
                tech={
                  <>
                    <span className="hidden sm:inline">nonce {a.nonce} · </span>
                    {a.nodeSaid ?? "—"}
                  </>
                }
                plain={a.landed ? "landed" : "on its way"}
              />
            </span>
            <a href={`https://sepolia.etherscan.io/tx/${a.txHash}`} target="_blank" rel="noreferrer" className="shrink-0 underline underline-offset-2 hover:bg-brutal-yellow">
              {short(a.txHash)} ↗
            </a>
          </span>
        </span>
      )}
    </li>
  );
}

export default function PayoutDemo() {
  const session = useLabSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
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

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await labPost(URL, session, {});
      await refresh();
    } catch (e) {
      setError(e instanceof LabRequestError ? e.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  const attempts = state?.attempts ?? [];
  const ran = attempts.length > 0;
  const limited = state?.remaining === 0;
  const canRun = Boolean(state?.funded) && !limited && !state?.settling && !busy;
  const done = ran && !state?.settling;

  const sides = [
    {
      side: "careless" as const,
      kind: "bad" as const,
      title: "Retry = send again",
      plainTitle: "Tries again from scratch",
      note: "catch (timeout) { await sendTransfer(to, amount) }",
      plainNote: "No reply? Make the payment again and send it.",
    },
    {
      side: "careful" as const,
      kind: "good" as const,
      title: "Retry = rebroadcast",
      plainTitle: "Tries the same payment again",
      note: "save(signTx(nonce)) → send(raw) … retry: send(raw) again",
      plainNote: "Saves the exact payment first. No reply? Sends that same one again.",
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
              <span className="font-mono text-[11px] opacity-70 truncate">
                <T tech="to" plain="To the freelancer at" /> {state ? short(state.freelancer) : "—"}
              </span>
            </div>
            <div className="[&_button]:w-full lg:w-[20rem]">
              <RunButton onClick={run} busy={busy || Boolean(state?.settling)} disabled={!canRun} size="md">
                <T tech="Pay · lose the reply" plain="Pay the freelancer" />
              </RunButton>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech="Real USDC transfers on Sepolia. Both sides send, the lab drops the node's reply on purpose, and each retries the way its code says. Three transfers per click: one careful, up to two careless."
                plain="Real payments on a test network. Both sides send, the lab throws away the reply on purpose, and each side tries again its own way."
              />
            </span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
              {state && !state.funded ? "Lab wallet empty" : `${state?.remaining ?? web3Limits.paysPerHour} of ${web3Limits.paysPerHour} payouts left this hour`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8">
          {sides.map(({ side, ...h }) => {
            const rows = attempts.filter((a) => a.side === side);
            const got = state?.received[side] ?? 0;
            const twice = done && got > payout.units;
            return (
              <div key={side} className="flex flex-col gap-4">
                <ImplHeader {...h} />
                <div className="border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] bg-white">
                  <ol aria-label={`${side} attempts`}>
                    {[1, 2].map((n) => (
                      <AttemptRow key={n} n={n} a={rows.find((r) => r.attempt === n)} />
                    ))}
                  </ol>
                  <div className={`h-16 border-t-[3px] border-brutal-black px-4 flex items-center justify-between gap-3 ${!done ? "bg-cream" : twice ? "bg-[#FF5CAA]" : "bg-[#C6FF3D]"}`}>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                      <T tech="Freelancer received" plain="The freelancer got" />
                    </span>
                    <span className="font-display font-black text-xl sm:text-2xl leading-none tabular-nums">
                      {!ran ? "—" : !done ? "…" : twice ? <T tech={`${fmt(got)} · twice`} plain={`${fmt(got)}, twice`} /> : fmt(got)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Stage>

      <Note tone={error ? "bad" : done && (state?.received.careless ?? 0) > payout.units ? "bad" : "neutral"}>
        {error ? (
          error
        ) : !ran ? (
          <T
            tech={`Pay ${fmt(payout.units)}. Both sides get no reply from the node and retry. Then open the hashes on Etherscan.`}
            plain="Pay the freelancer. Both sides never hear back and try again. Then check what really happened, on a public explorer."
          />
        ) : !done ? (
          <T tech="Sent. Waiting for the transfers to land in a block." plain="Sent. Waiting for the payments to land." />
        ) : (state?.received.careless ?? 0) > payout.units ? (
          <T
            tech="Two different transactions, two nonces, two transfers: the first one had gone through, only the reply was lost. The careful retry sent the same signed bytes, the node said so, and only one transfer exists."
            plain="The first payment had gone through: only the reply was lost. The simple retry paid a second time. The careful retry sent the same saved payment, so there is only one."
          />
        ) : (
          <T tech="Only one careless transfer landed this time. Run it again." plain="This time the second payment didn't go out. Try again." />
        )}
      </Note>

      <Limits>
        <T
          tech={`Limit: ${web3Limits.paysPerHour} runs per hour per visitor, ${web3Limits.paysPerDay} transfers a day for everyone. Test USDC paid out goes to an address the studio key controls.`}
          plain={`${web3Limits.paysPerHour} tries an hour each. Every payment is real and uses up the lab's test money.`}
        />
      </Limits>
    </div>
  );
}

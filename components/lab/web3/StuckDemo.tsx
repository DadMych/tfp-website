"use client";

import { useCallback, useEffect, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { stuck, web3Limits, type StuckClient } from "@/lib/web3-lab";
import type { CarefulStatus, CarelessStatus } from "@/lib/web3/stuck";
import { ImplHeader, Limits, Note, RunButton, Stage } from "../money/ui";
import { T } from "../money/Explain";

interface Inv {
  client: StuckClient;
  label: string;
  address: string;
  chain: { txHash: string; units: number; confirmations: number } | null;
  webhook: number | null;
  careless: CarelessStatus;
  careful: CarefulStatus;
}
interface State {
  tip: number;
  invoices: Inv[];
  paid: boolean;
  settling: boolean;
  remaining: number;
  funded: boolean;
}

const URL = "/api/lab/web3/stuck-deposits";
const N = stuck.needed;
const amount = `${stuck.units.toLocaleString("en-US")} USDC`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

const CARELESS: Record<CarelessStatus, { tech: string; plain: string; bg: string }> = {
  awaiting: { tech: "awaiting payment", plain: "Not paid yet", bg: "bg-white" },
  paid: { tech: "paid", plain: "Paid", bg: "bg-[#C6FF3D]" },
  reminder: { tech: "unpaid · reminder sent", plain: "Not paid · reminder sent", bg: "bg-[#FF5CAA]" },
};

const CAREFUL: Record<CarefulStatus, { tech: string; plain: string; bg: string }> = {
  awaiting: { tech: "awaiting payment", plain: "Not paid yet", bg: "bg-white" },
  confirming: { tech: "on chain · confirming", plain: "Payment on its way", bg: "bg-white" },
  paid: { tech: "paid · provider agrees", plain: "Paid", bg: "bg-[#C6FF3D]" },
  "waiting-provider": { tech: "paid · waiting for provider", plain: "Paid · waiting for the service", bg: "bg-[#C6FF3D]" },
  "provider-late": { tech: "paid · provider was late", plain: "Paid · the service was late", bg: "bg-[#C6FF3D]" },
  "provider-silent": { tech: "paid · provider silent, flagged", plain: "Paid · service silent, flagged", bg: "bg-[#FFD23F]" },
};

const nameOf = (c: StuckClient) => stuck.clients.find((x) => x.id === c)!.name;

export default function StuckDemo() {
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

  const run = useCallback(async () => {
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
  }, [session, refresh]);

  useEffect(() => {
    if (!session) return;
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4_000);
    return () => clearInterval(id);
  }, [session, refresh]);

  const invs = state?.invoices ?? [];
  const inv = (c: StuckClient) => invs.find((i) => i.client === c);
  const limited = state?.remaining === 0;
  const canRun = Boolean(state?.funded) && !limited && !state?.settling && !busy;
  const chased = invs.filter((i) => i.careless === "reminder");
  const silent = invs.some((i) => i.careful === "provider-silent");
  const late = invs.some((i) => i.careful === "provider-late");

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:items-center">
            <span className="font-display font-black text-2xl md:text-3xl tracking-[-0.03em] tabular-nums">
              <T tech={`3 invoices · ${amount} each`} plain={`Three bills · ${amount} each`} />
            </span>
            <div className="[&_button]:w-full lg:w-[20rem]">
              <RunButton onClick={run} busy={busy || Boolean(state?.settling)} disabled={!canRun} size="md">
                <T tech="Three clients pay" plain="Three clients pay" />
              </RunButton>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech="Three real USDC transfers on Sepolia, one per invoice address. The deposit provider is simulated: it reports A on time, B six blocks late, C never."
                plain="Three real test payments, one per bill. The payment service is simulated: it tells you about one on time, one late, and one never."
              />
            </span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
              {state && !state.funded ? "Lab wallet empty" : `${state?.remaining ?? web3Limits.paysPerHour} of ${web3Limits.paysPerHour} runs left this hour`}
            </span>
          </div>
        </div>

        <div className="relative">
          <span className="absolute -top-2.5 left-3 z-10 bg-[#FFD23F] border-[2px] border-brutal-black px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em]">Simulator</span>
          <ol className="flex flex-col border-[3px] border-brutal-black bg-cream" aria-label="Provider webhooks">
            {stuck.clients.map((c) => {
              const i = inv(c.id);
              const missing = i?.careful === "provider-silent";
              return (
                <li key={c.id} className="h-11 px-3 flex items-center gap-3 border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] min-w-0">
                  <span className={`w-2.5 h-2.5 shrink-0 border-[2px] border-brutal-black ${i?.webhook ? "bg-[#C6FF3D]" : missing ? "bg-[#FF5CAA]" : "bg-white"}`} aria-hidden="true" />
                  <span className="font-bold shrink-0">{c.name}</span>
                  <span className="opacity-70 truncate flex-1 min-w-0">
                    {!i?.chain ? (
                      <T tech="no webhook yet" plain="nothing yet" />
                    ) : i.webhook ? (
                      <T tech={<>deposit.confirmed<span className="hidden sm:inline"> · block {i.webhook.toLocaleString("en-US")}</span></>} plain="says: paid" />
                    ) : missing ? (
                      <T tech="no webhook" plain="says nothing" />
                    ) : (
                      <T tech="waiting for webhook…" plain="…" />
                    )}
                  </span>
                  {i?.chain ? (
                    <a href={`https://sepolia.etherscan.io/tx/${i.chain.txHash}`} target="_blank" rel="noreferrer" className="hidden sm:inline shrink-0 underline underline-offset-2 hover:bg-brutal-yellow">
                      {short(i.chain.txHash)} ↗
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8">
          {(
            [
              { key: "careless", kind: "bad", title: "Trust the provider", plainTitle: "Waits to be told", note: "onWebhook(\"deposit.confirmed\", e => markPaid(e.invoice))", plainNote: "Marks a bill paid only when the payment service says so." },
              { key: "careful", kind: "good", title: "Reconcile with the chain", plainTitle: "Checks for itself", note: "getLogs(USDC.Transfer, { to: invoiceAddresses }) ⇄ webhooks", plainNote: "Looks at the payments itself and compares with what the service says." },
            ] as const
          ).map((side) => (
            <div key={side.key} className="flex flex-col gap-4">
              <ImplHeader kind={side.kind} title={side.title} plainTitle={side.plainTitle} note={side.note} plainNote={side.plainNote} />
              <ul className="border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000]">
                {stuck.clients.map((c) => {
                  const i = inv(c.id);
                  const s = !i ? null : side.key === "careless" ? CARELESS[i.careless] : CAREFUL[i.careful];
                  const confirming = side.key === "careful" && i?.careful === "confirming";
                  return (
                    <li key={c.id} className={`h-14 px-3 sm:px-4 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black last:border-b-0 min-w-0 ${s?.bg ?? "bg-white"}`}>
                      <span className="font-display font-black text-base sm:text-lg leading-none shrink-0">{c.name}</span>
                      <span className="font-mono text-[11px] leading-tight text-right line-clamp-2 min-w-0">
                        {!s ? "—" : confirming ? <T tech={`on chain · ${Math.min(i!.chain!.confirmations, N)} / ${N}`} plain={s.plain} /> : <T tech={s.tech} plain={s.plain} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Stage>

      <Note tone={error ? "bad" : chased.length ? "bad" : "neutral"}>
        {error ? (
          error
        ) : !state?.paid ? (
          <T
            tech={`Three invoices for ${amount}. All three clients pay at once; then watch what the provider reports and what the chain shows.`}
            plain={`Three bills for ${amount}. All three clients pay at once. Then see what the payment service says, and what really happened.`}
          />
        ) : state.settling && !chased.length ? (
          <T tech={`Waiting for ${N} blocks and the provider's webhooks.`} plain="Waiting for the payments to settle and the service to report them." />
        ) : chased.length && !late ? (
          <T
            tech={`${chased.map((i) => nameOf(i.client)).join(" and ")} paid and got a reminder: the provider-only book has no record. The reconciled book saw the transfers on chain and flagged the provider instead.${chased.some((i) => i.client === "b") ? " Wait for B's late webhook." : ""}`}
            plain={`${chased.map((i) => nameOf(i.client)).join(" and ")} paid and still got chased: the careless side only listens to the service. The careful side saw the payments and flagged the service instead.`}
          />
        ) : chased.length ? (
          <T
            tech={`B's webhook came in late and the careless book caught up. C's never will: on the provider-only side a paid client stays "unpaid" for as long as nobody opens a ticket. The reconciled side credited C from the chain and flagged the gap.`}
            plain="The service finally reported B. It will never report C, so the careless side keeps chasing a client who paid. The careful side marked C paid from the payment itself and flagged the missing message."
          />
        ) : silent ? (
          <T tech="The reconciled book flagged a missing webhook." plain="The careful side flagged a missing message." />
        ) : (
          <T tech="Both books agree so far." plain="Both sides agree so far." />
        )}
      </Note>

      <Limits>
        <T
          tech={`Limit: ${web3Limits.paysPerHour} runs per hour per visitor (three transfers each), ${web3Limits.paysPerDay} transfers a day for everyone. The provider is simulated; the transfers and the chain read are real.`}
          plain={`${web3Limits.paysPerHour} tries an hour each. Every payment is real and uses up the lab's test money.`}
        />
      </Limits>
    </div>
  );
}

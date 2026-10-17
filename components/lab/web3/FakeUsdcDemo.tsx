"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { fakeUsdc, web3Limits, type FakeUsdcToken } from "@/lib/web3-lab";
import { ImplHeader, Limits, Note, RunButton, Stage } from "../money/ui";
import { T } from "../money/Explain";

interface Deposit {
  token: FakeUsdcToken;
  contract: string;
  symbol: string;
  units: number;
  txHash: string;
  confirmations: number;
  settled: boolean;
  careless: boolean;
  careful: boolean;
}

interface State {
  tip: number;
  deployed: boolean;
  invoice: { label: string; address: string } | null;
  deposits: Deposit[];
  booked: { careless: number; careful: number };
  remaining: number;
  funded: boolean;
}

const URL = "/api/lab/web3/fake-usdc";
const N = fakeUsdc.needed;
const fmt = (n: number) => `${n.toLocaleString("en-US")} USDC`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const ISSUER: Record<FakeUsdcToken, string> = { real: "Circle", fake: "me" };

/** One deposit as a book sees it: counted towards the invoice, or not. */
function BookRow({ d, side }: { d: Deposit | undefined; side: "careless" | "careful" }) {
  const counted = d?.[side];
  return (
    <li className="h-14 px-3 flex items-center gap-3 border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] min-w-0">
      {!d ? (
        <span className="opacity-30">—</span>
      ) : (
        <>
          <span className={`shrink-0 px-1.5 py-0.5 border-[2px] border-brutal-black text-[10px] font-bold uppercase tracking-[0.1em] ${d.token === "fake" ? "bg-[#FF5CAA]" : "bg-white"}`}>
            <T tech={d.token === "fake" ? "fake" : "Circle"} plain={d.token === "fake" ? "fake" : "real"} />
          </span>
          <span className="flex-1 min-w-0 line-clamp-2 leading-tight">
            {!d.settled ? (
              <T tech={`${d.confirmations} / ${N} blocks`} plain="On its way" />
            ) : counted ? (
              <T tech={`counted ${d.units.toLocaleString("en-US")}`} plain={`Counted ${d.units.toLocaleString("en-US")}`} />
            ) : (
              <T tech={`ignored: ${short(d.contract)} isn't Circle's USDC`} plain="Ignored: not issued by Circle" />
            )}
          </span>
        </>
      )}
    </li>
  );
}

export default function FakeUsdcDemo() {
  const session = useLabSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<FakeUsdcToken | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  const refresh = useCallback(async () => {
    if (!session) return null;
    try {
      const s = await labGet<State>(URL, session);
      setState(s);
      return s;
    } catch (e) {
      setError(e instanceof LabRequestError ? e.message : "couldn't reach the chain");
      return null;
    }
  }, [session]);

  const act = useCallback(
    async (body: { action: "new" } | { action: "pay"; token: FakeUsdcToken }) => {
      setBusy(body.action === "new" ? "new" : body.token);
      setError(null);
      try {
        await labPost(URL, session, body);
        await refresh();
      } catch (e) {
        setError(e instanceof LabRequestError ? e.message : "request failed");
      } finally {
        setBusy(null);
      }
    },
    [session, refresh]
  );

  useEffect(() => {
    if (!session) return;
    void refresh().then((s) => {
      // A first visit gets its invoice, so the address is there before anyone pays.
      if (s && !s.invoice && !seeded.current) {
        seeded.current = true;
        void act({ action: "new" });
      }
    });
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4_000);
    return () => clearInterval(id);
  }, [session, refresh, act]);

  const deps = state?.deposits ?? [];
  const settling = deps.some((d) => !d.settled);
  const limited = state?.remaining === 0;
  const canPay = Boolean(state?.funded) && !limited && !settling && busy === null;
  const has = (t: FakeUsdcToken) => deps.some((d) => d.token === t);
  const fooled = deps.some((d) => d.token === "fake" && d.settled && d.careless);
  const realSettled = deps.some((d) => d.token === "real" && d.settled);

  const sides = [
    { side: "careless" as const, kind: "bad" as const, title: "Checks the symbol", plainTitle: "Reads the name", note: 'await token.symbol() === "USDC"', plainNote: "Says USDC on the label? Then it's paid." },
    { side: "careful" as const, kind: "good" as const, title: "Checks the contract", plainTitle: "Checks who issued it", note: "log.address === USDC_SEPOLIA && chainId === 11155111", plainNote: "Only counts digital dollars issued by Circle." },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:items-center">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-display font-black text-2xl md:text-3xl tracking-[-0.03em] tabular-nums whitespace-nowrap">
                {fakeUsdc.label} · {fmt(fakeUsdc.units)}
              </span>
              <span className="font-mono text-[11px] opacity-70 truncate">
                <T tech="own address" plain="Its own address" />: {state?.invoice ? short(state.invoice.address) : "—"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 [&_button]:w-full lg:w-[28rem]">
              <RunButton onClick={() => act({ action: "pay", token: "fake" })} busy={busy === "fake"} disabled={!canPay || has("fake")} size="md">
                <T tech="Pay in fake USDC" plain="Pay with fake money" />
              </RunButton>
              <RunButton onClick={() => act({ action: "pay", token: "real" })} busy={busy === "real"} disabled={!canPay || has("real")} size="md" tone="white">
                <T tech="Pay in real USDC" plain="Pay with real money" />
              </RunButton>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech="Both buttons send a real transfer on Sepolia to the invoice's address: one from Circle's USDC contract, one from a contract I deployed and named USD Coin / USDC, 6 decimals."
                plain="Both buttons send a real test payment. One is Circle's digital dollar. The other is one I made and gave the same name."
              />
            </span>
            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
                {state && !state.deployed ? "Fake token not deployed" : state && !state.funded ? "Lab wallet empty" : `${state?.remaining ?? web3Limits.paysPerHour} of ${web3Limits.paysPerHour} payments left this hour`}
              </span>
              <button
                type="button"
                onClick={() => act({ action: "new" })}
                disabled={!session || busy !== null || settling}
                className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] underline decoration-2 underline-offset-4 hover:bg-brutal-yellow disabled:opacity-40"
              >
                ↺ <T tech="New invoice" plain="Start over" />
              </button>
            </span>
          </div>
        </div>

        <ol className="flex flex-col border-[3px] border-brutal-black bg-cream" aria-label="Deposits">
          {[0, 1].map((i) => {
            const d = deps[i];
            return (
              <li key={i} className="h-11 px-3 flex items-center gap-3 border-b-[2px] border-brutal-black/10 last:border-b-0 font-mono text-[11px] min-w-0">
                {!d ? (
                  <span className="opacity-30">{i === 0 ? <T tech="no deposits yet" plain="No payments yet" /> : ""}</span>
                ) : (
                  <>
                    <span className={`w-2.5 h-2.5 shrink-0 border-[2px] border-brutal-black ${d.settled ? "bg-[#C6FF3D]" : "bg-white"}`} aria-hidden="true" />
                    <span className="font-bold shrink-0">{d.units.toLocaleString("en-US")} {d.symbol}</span>
                    <span className="opacity-70 truncate flex-1 min-w-0">
                      <T tech={<><span className="hidden sm:inline">contract </span>{short(d.contract)}</>} plain={`issued by ${ISSUER[d.token]}`} />
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
          {sides.map(({ side, ...h }) => {
            const booked = state?.booked[side] ?? 0;
            const paid = booked >= fakeUsdc.units;
            const wrong = deps.some((d) => d.token === "fake" && d.settled && d[side]);
            return (
              <div key={side} className="flex flex-col gap-4">
                <ImplHeader {...h} />
                <div className="border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] bg-white">
                  <ol aria-label={`${side} book`}>
                    {[0, 1].map((i) => (
                      <BookRow key={i} d={deps[i]} side={side} />
                    ))}
                  </ol>
                  <div className={`h-16 border-t-[3px] border-brutal-black px-4 flex items-center justify-between gap-3 ${!paid ? "bg-cream" : wrong ? "bg-[#FF5CAA]" : "bg-[#C6FF3D]"}`}>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{fakeUsdc.label}</span>
                    <span className="font-display font-black text-xl sm:text-2xl leading-none tabular-nums">
                      {!paid ? <T tech="open" plain="Not paid" /> : booked > fakeUsdc.units ? <T tech={`paid · ${fmt(booked)}`} plain="Paid twice" /> : <T tech="paid" plain="Paid" />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Stage>

      <Note tone={error ? "bad" : fooled ? "bad" : "neutral"}>
        {error ? (
          error
        ) : deps.length === 0 ? (
          <T
            tech={`One invoice for ${fmt(fakeUsdc.units)}. Pay it in fake USDC first and watch both books.`}
            plain={`One bill for ${fmt(fakeUsdc.units)}. Pay it with the fake money first and see what each side says.`}
          />
        ) : settling ? (
          <T tech={`Waiting for ${N} blocks on the transfer.`} plain="Waiting for the payment to settle." />
        ) : fooled && !realSettled ? (
          <T
            tech="The symbol check closed the invoice on a token I minted for free. The work ships, and the studio holds coins nobody will redeem. The address check still shows it open. Now pay in real USDC."
            plain="The careless side marked the bill paid with money I made up for free. The work gets handed over for nothing. The careful side still says not paid. Now pay with real money."
          />
        ) : fooled ? (
          <T
            tech="Real USDC arrived too. The symbol check now counts 11,600 against a 5,800 invoice, half of it worthless; the address check counts 5,800 and closes it once."
            plain="Real money arrived too. The careless side thinks it was paid twice, half of it in worthless coins. The careful side counts the real payment, once."
          />
        ) : (
          <T tech="Both books agree on real USDC. Start a new invoice and pay it in fake USDC." plain="Both sides agree on real money. Start over and pay with the fake money." />
        )}
      </Note>

      <Limits>
        <T
          tech={`Limit: ${web3Limits.paysPerHour} payments per hour per visitor, ${web3Limits.paysPerDay} transfers a day for everyone. The fake token is Sepolia-only and says so in its notice() field.`}
          plain={`${web3Limits.paysPerHour} payments an hour each. Every payment is real and uses up the lab's test money.`}
        />
      </Limits>
    </div>
  );
}

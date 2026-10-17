"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { web3Limits, whichInvoice, type WhichClient } from "@/lib/web3-lab";
import { ImplHeader, Limits, Note, RunButton, Stage } from "../money/ui";
import { T } from "../money/Explain";

interface State {
  tip: number;
  shared: string;
  invoices: { client: WhichClient; label: string; address: string; paid: boolean; careless: WhichClient | null; careful: WhichClient | null }[];
  deposits: { client: WhichClient; units: number; to: string; txHash: string; confirmations: number; settled: boolean; careless: WhichClient | null; careful: WhichClient | null }[];
  remaining: number;
  funded: boolean;
}

const URL = "/api/lab/web3/which-invoice";
const N = whichInvoice.needed;
const amount = `${whichInvoice.units.toLocaleString("en-US")} USDC`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const nameOf = (c: WhichClient) => whichInvoice.clients.find((x) => x.id === c)!.name;

/** One invoice row in a book: who the book thinks paid it. */
function Row({ client, by }: { client: WhichClient; by: WhichClient | null }) {
  const wrong = by != null && by !== client;
  return (
    <li className={`h-14 px-3 sm:px-4 flex items-center justify-between gap-3 border-b-[3px] border-brutal-black last:border-b-0 min-w-0 ${wrong ? "bg-[#FF5CAA]" : by ? "bg-[#C6FF3D]" : "bg-white"}`}>
      <span className="font-display font-black text-base sm:text-lg leading-none shrink-0">{nameOf(client)}</span>
      <span className="font-mono text-[11px] leading-tight text-right line-clamp-2 min-w-0">
        {!by ? (
          <T tech="open" plain="Not paid" />
        ) : wrong ? (
          <T tech={`paid, with ${nameOf(by)}'s money`} plain={`Marked paid. It was ${nameOf(by)}'s money`} />
        ) : (
          <T tech={`paid by ${nameOf(by)}`} plain="Paid" />
        )}
      </span>
    </li>
  );
}

export default function WhichInvoiceDemo() {
  const session = useLabSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<WhichClient | "new" | null>(null);
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
    async (body: { action: "new" } | { action: "pay"; client: WhichClient }) => {
      setBusy(body.action === "new" ? "new" : body.client);
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
      // A first visit gets its pair of invoices, so the addresses are there before anyone pays.
      if (s && s.invoices.length === 0 && !seeded.current) {
        seeded.current = true;
        void act({ action: "new" });
      }
    });
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4_000);
    return () => clearInterval(id);
  }, [session, refresh, act]);

  const invs = state?.invoices ?? [];
  const deps = state?.deposits ?? [];
  const settling = deps.some((d) => !d.settled);
  const limited = state?.remaining === 0;
  const canPay = Boolean(state?.funded) && !limited && !settling && busy === null;
  const wrong = invs.some((i) => i.careless != null && i.careless !== i.client);
  const settled = deps.filter((d) => d.settled);

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pb-6 border-b-[3px] border-brutal-black">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {whichInvoice.clients.map((c) => {
              const inv = invs.find((i) => i.client === c.id);
              return (
                <div key={c.id} className="border-[3px] border-brutal-black bg-cream p-4 flex flex-col gap-3 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-display font-black text-xl leading-none whitespace-nowrap">{c.name}</span>
                    <span className="font-mono text-[11px] tabular-nums opacity-70 whitespace-nowrap">
                      {c.label} · {amount}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] opacity-70 truncate">
                    <T tech="own address" plain="Its own address" />: {inv ? short(inv.address) : "—"}
                  </span>
                  <div className="[&_button]:w-full">
                    <RunButton onClick={() => act({ action: "pay", client: c.id })} busy={busy === c.id} disabled={!canPay || !inv || inv.paid} size="md" tone={c.id === "b" ? "yellow" : "white"}>
                      {inv?.paid ? <T tech={`${c.name} paid`} plain={`${c.name} paid`} /> : <T tech={`${c.name} pays`} plain={`${c.name} pays`} />}
                    </RunButton>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-mono text-[11px] leading-snug opacity-70">
              <T
                tech={`One real transfer per click, to that invoice's own address. The careless book reads the same transfers as if every invoice shared ${state ? short(state.shared) : "one address"}: it only sees amounts.`}
                plain="Each click is one real test payment, sent to that bill's own address. The careless side reads the same payments as if they all landed in one place."
              />
            </span>
            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
                {state && !state.funded ? "Lab wallet empty" : `${state?.remaining ?? web3Limits.paysPerHour} of ${web3Limits.paysPerHour} payments left this hour`}
              </span>
              <button
                type="button"
                onClick={() => act({ action: "new" })}
                disabled={!session || busy !== null || settling}
                className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] underline decoration-2 underline-offset-4 hover:bg-brutal-yellow disabled:opacity-40"
              >
                ↺ <T tech="New pair" plain="Start over" />
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
                    <span className="font-bold shrink-0">{nameOf(d.client)}</span>
                    <span className="opacity-70 truncate flex-1 min-w-0">
                      <T
                        tech={
                          <>
                            {d.units.toLocaleString("en-US")}
                            <span className="hidden sm:inline"> → {short(d.to)}</span>
                          </>
                        }
                        plain={`paid ${d.units.toLocaleString("en-US")}`}
                      />
                      {" · "}
                      {d.settled ? <T tech="settled" plain="arrived" /> : `${d.confirmations} / ${N}`}
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
          {(
            [
              { kind: "bad", title: "One address, match by amount", plainTitle: "One address for everyone", note: "openInvoices.find(i => i.amount === deposit.amount)", plainNote: "All payments land in one place. It guesses the bill from the amount.", key: "careless" },
              { kind: "good", title: "One address per invoice", plainTitle: "Every bill has its own address", note: "invoiceByAddress(deposit.to)", plainNote: "Each bill has its own address, so the address says whose payment it is.", key: "careful" },
            ] as const
          ).map((side) => (
            <div key={side.key} className="flex flex-col gap-4">
              <ImplHeader kind={side.kind} title={side.title} plainTitle={side.plainTitle} note={side.note} plainNote={side.plainNote} />
              <ul className="border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000]">
                {whichInvoice.clients.map((c) => {
                  const inv = invs.find((i) => i.client === c.id);
                  return <Row key={c.id} client={c.id} by={inv ? inv[side.key] : null} />;
                })}
              </ul>
            </div>
          ))}
        </div>
      </Stage>

      <Note tone={error ? "bad" : wrong ? "bad" : "neutral"}>
        {error ? (
          error
        ) : deps.length === 0 ? (
          <T
            tech={`Two clients, two invoices, both for ${amount}. Have ${nameOf("b")} pay first and watch which invoice each book closes.`}
            plain={`Two clients each owe ${amount}. Have ${nameOf("b")} pay first, then see which bill each side marks as paid.`}
          />
        ) : settling ? (
          <T tech={`Waiting for ${N} blocks on the transfer.`} plain="Waiting for the payment to settle." />
        ) : wrong && settled.length === 1 ? (
          <T
            tech={`${nameOf("b")} paid. The shared-address book closed ${nameOf("a")}'s invoice: first open invoice for ${amount}. ${nameOf("a")} gets the work, ${nameOf("b")} gets a reminder. Now have ${nameOf("a")} pay.`}
            plain={`${nameOf("b")} paid, and the careless side marked ${nameOf("a")} as paid. ${nameOf("a")} gets the work, ${nameOf("b")} gets chased. Now let ${nameOf("a")} pay.`}
          />
        ) : wrong ? (
          <T
            tech="Both invoices closed on the careless side, each with the other client's money. The totals balance, so nothing alerts; every receipt and every reminder in between went to the wrong client."
            plain="Both bills now say paid on the careless side, each with the other client's money. The totals add up, so nobody notices what went wrong in between."
          />
        ) : (
          <T tech="Both books agree. Start a new pair and pay the other way round." plain="Both sides agree. Start over and pay the other client first." />
        )}
      </Note>

      <Limits>
        <T
          tech={`Limit: ${web3Limits.paysPerHour} payments per hour per visitor, ${web3Limits.paysPerDay} transfers a day for everyone. Each invoice address is derived from the studio key; the test USDC on it stays there.`}
          plain={`${web3Limits.paysPerHour} payments an hour each. Every payment is real and uses up the lab's test money.`}
        />
      </Limits>
    </div>
  );
}

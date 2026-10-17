"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { labGet, labPost, LabRequestError, useLabSession } from "@/lib/lab/client";
import { moneyLimits } from "@/lib/money-lab";
import { Limits, Note, RawRows, RunButton, Stage } from "./ui";
import { DbRows, T, TechOnly, useExplain } from "./Explain";

const SECRET = "whsec_moneylab_demo_2026";
const SLOTS = 10;
/** Real arrival gaps are a few ms; stretched so the eye can follow them. */
const STRETCH = 3;

type Scenario = "fresh" | "replay" | "out_of_order" | "bad_signature" | "chaos";
type Result = "processed" | "duplicate" | "stale" | "bad_signature" | "bad_payload";

interface DeliveryRow extends Record<string, unknown> {
  id: number;
  event_id: string | null;
  event_type: string | null;
  source: "button" | "http";
  result: Result;
  latency_ms: number;
  received_at: string;
}
interface OrderRow extends Record<string, unknown> {
  order_id: string;
  state: string;
  last_event_at: string;
}
interface State {
  deliveries: DeliveryRow[];
  orders: OrderRow[];
  totals: Partial<Record<Result, number>>;
}
interface Letter {
  type: string;
  forged: boolean;
  result: Result;
  at: number;
}
interface Batch {
  scenario: Scenario;
  order: string;
  state: string | null;
  letters: Letter[];
}

const SCENARIOS: { id: Scenario; label: string; what: string; plainLabel: string; plainWhat: string; cost: number }[] = [
  { id: "fresh", label: "New order", what: "authorized, then captured", plainLabel: "Deliver once", plainWhat: "two letters, in order", cost: 2 },
  { id: "replay", label: "Replay ×5", what: "captured, five copies at once", plainLabel: "5 copies", plainWhat: "the same letter, five times", cost: 6 },
  { id: "out_of_order", label: "Out of order", what: "captured before authorized", plainLabel: "Late letter", plainWhat: "the older letter comes last", cost: 2 },
  { id: "bad_signature", label: "Bad signature", what: "right body, wrong HMAC", plainLabel: "Forge one", plainWhat: "a fake 'money taken'", cost: 1 },
  { id: "chaos", label: "Chaos", what: "10 at once: dupes, late, forged", plainLabel: "Chaos", plainWhat: "10 letters at once: copies, late, fakes", cost: 10 },
];

const KIND: Record<string, { plain: string; tech: string }> = {
  "payment.authorized": { plain: "Money held", tech: "authorized" },
  "payment.captured": { plain: "Money taken", tech: "captured" },
};
const STAMP: Record<Result, { plain: string; cls: string }> = {
  processed: { plain: "accepted", cls: "bg-[#C6FF3D]" },
  duplicate: { plain: "repeat", cls: "bg-brutal-yellow" },
  stale: { plain: "old news", cls: "bg-brutal-yellow" },
  bad_signature: { plain: "fake", cls: "bg-[#FF5CAA]" },
  bad_payload: { plain: "unreadable", cls: "bg-[#FF5CAA]" },
};
const ORDER_PLAIN: Record<string, string> = { authorized: "On hold", captured: "Paid" };

const RESULT_CLS: Record<Result, string> = {
  processed: "text-[#4ade80]",
  duplicate: "text-brutal-yellow",
  stale: "text-brutal-yellow",
  bad_signature: "text-brutal-coral",
  bad_payload: "text-brutal-coral",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="border-[2px] border-brutal-black bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow transition-colors"
    >
      {done ? "Copied" : label}
    </button>
  );
}

/** What the page's naive handler would have done with the same letters: fulfil once per captured delivery, forged or not. */
function tally(b: Batch) {
  const n = (r: Result) => b.letters.filter((l) => l.result === r).length;
  return {
    accepted: n("processed"),
    repeats: n("duplicate"),
    old: n("stale"),
    fakes: n("bad_signature") + n("bad_payload"),
    sent: b.letters.filter((l) => l.result === "processed" && l.type === "payment.captured").length,
    naive: b.letters.filter((l) => l.type === "payment.captured").length,
  };
}

export default function WebhooksDemo() {
  const session = useLabSession();
  const [origin, setOrigin] = useState("");
  const [state, setState] = useState<State>({ deliveries: [], orders: [], totals: {} });
  const [busy, setBusy] = useState<Scenario | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [shown, setShown] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const { plain } = useExplain();
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      setState(await labGet<State>("/api/lab/money/webhooks/state", session));
    } catch {
      /* keep last */
    }
  }, [session]);

  const loadLimit = useCallback(() => {
    labGet<{ remaining: number; resetAt: number }>("/api/lab/money/webhooks/send", session)
      .then((r) => {
        setRemaining(r.remaining);
        setResetAt(r.resetAt);
      })
      .catch(() => undefined);
  }, [session]);
  useEffect(() => {
    if (session !== null) loadLimit();
  }, [session, loadLimit]);

  // Poll so curl deliveries show up without a click. Pauses in background tabs.
  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id = window.setInterval(tick, 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const limited = remaining === 0;
  const resetClock = resetAt ? new Date(resetAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const revealing = batch !== null && shown < batch.letters.length;
  const locked = busy !== null || revealing;

  async function play(s: Scenario) {
    timers.current.forEach(clearTimeout);
    setBusy(s);
    setError(null);
    setBatch(null);
    setShown(0);
    try {
      const out = await labPost<{ order_id: string; order_state: string | null; deliveries: Letter[]; remaining: number }>("/api/lab/money/webhooks/send", session, {
        scenario: s,
      });
      setRemaining(out.remaining);
      const letters = out.deliveries.map(({ type, forged, result, at }) => ({ type, forged, result, at }));
      setBatch({ scenario: s, order: out.order_id, state: out.order_state, letters });
      const first = letters[0]?.at ?? 0;
      timers.current = letters.map((l, i) => window.setTimeout(() => setShown(i + 1), 150 + (s === "chaos" ? (l.at - first) * STRETCH : i * 350)));
      await refresh();
    } catch (e) {
      if (e instanceof LabRequestError && e.status === 429) {
        setRemaining(0);
        loadLimit();
        setError("limit");
      } else setError(e instanceof LabRequestError ? e.message : "request failed");
    } finally {
      setBusy(null);
    }
  }

  const inboxUrl = `${origin || "https://tfpdev.com"}/api/lab/money/webhooks/in/${session ?? "<inbox>"}`;
  const curl = `BODY='{"id":"evt_curl_1","type":"payment.captured","order_id":"ord_curl","created":'"$(date +%s)"'}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "${SECRET}" | sed 's/^.* //')
curl -s -X POST "${inboxUrl}" \\
  -H "Content-Type: application/json" -H "X-Signature: sha256=$SIG" -d "$BODY"
# run it twice: the second answer is {"result":"duplicate"}`;

  const t = state.totals;
  const pendingCost = busy ? (SCENARIOS.find((s) => s.id === busy)?.cost ?? 0) : 0;
  const done = batch && !revealing ? tally(batch) : null;
  const orderLabel = done ? (plain ? (batch!.state ? ORDER_PLAIN[batch!.state] ?? batch!.state : "Untouched") : (batch!.state ?? "no row")) : "—";
  const orderTone = done && done.sent === 1 && batch!.state === "captured" ? "bg-[#C6FF3D]" : "bg-white";

  return (
    <div className="flex flex-col gap-6">
      <Stage className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_17rem] gap-6">
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brutal-black/55">
                <T tech="Last batch, in arrival order" plain="Letters, as they arrive" />
              </span>
              {!plain && (
                <span className="hidden xl:inline font-mono text-[10px] text-brutal-black/55 truncate">
                  inbox total · {t.processed ?? 0} processed · {t.duplicate ?? 0} duplicate · {t.stale ?? 0} stale · {(t.bad_signature ?? 0) + (t.bad_payload ?? 0)} rejected
                </span>
              )}
            </div>
            <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Array.from({ length: SLOTS }, (_, i) => {
                const l = batch && i < shown ? batch.letters[i] : null;
                if (!l)
                  return (
                    <li
                      key={i}
                      className={`h-14 sm:h-[4.75rem] border-[3px] border-dashed flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.15em] ${
                        i < pendingCost ? "border-brutal-black text-brutal-black/60 pulse-dot" : "border-brutal-black/20 text-brutal-black/30"
                      }`}
                    >
                      {i < pendingCost ? <T tech="in flight" plain="on its way" /> : i + 1}
                    </li>
                  );
                const k = KIND[l.type] ?? { plain: l.type, tech: l.type };
                return (
                  <li key={i} className="h-14 sm:h-[4.75rem] border-[3px] border-brutal-black bg-white shadow-[3px_3px_0_0_#000] flex flex-col overflow-hidden">
                    <div className="flex-1 px-2 pt-1.5 flex flex-col min-w-0">
                      <span className="font-display font-bold text-sm leading-tight truncate">
                        <T tech={k.tech} plain={k.plain} />
                      </span>
                      <span className="hidden sm:block font-mono text-[9px] leading-tight opacity-60 truncate">
                        {l.forged ? <T tech="bad HMAC" plain="fake signature" /> : <T tech={`+${l.at} ms`} plain={`letter ${i + 1}`} />}
                      </span>
                    </div>
                    <span className={`border-t-[2px] border-brutal-black px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] truncate ${STAMP[l.result].cls}`}>
                      <T tech={l.result.replace("_", " ")} plain={STAMP[l.result].plain} />
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className={`border-[3px] border-brutal-black shadow-[4px_4px_0_0_#000] p-4 flex flex-col gap-3 transition-colors ${orderTone}`}>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 truncate">
              <T tech={`wh.orders · ${batch?.order ?? "—"}`} plain="The order" />
            </span>
            <span className="font-display font-black text-4xl leading-none tracking-[-0.04em] truncate">{orderLabel}</span>
            <div className="mt-auto flex flex-col gap-1.5 border-t-[2px] border-brutal-black/20 pt-3 font-mono text-[11px] leading-snug">
              <span className="flex justify-between gap-2">
                <T tech="fulfil() ran" plain="Packed and sent" />
                <b className="tabular-nums">{done ? `${done.sent}×` : "—"}</b>
              </span>
              <span className="flex justify-between gap-2 opacity-70">
                <T tech="naive handler would" plain="A trusting mailbox" />
                <b className="tabular-nums">{done ? `${done.naive}×` : "—"}</b>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t-[3px] border-brutal-black pt-5">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">
              <T tech="Play the provider" plain="Be the messenger" />
            </span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${limited ? "text-brutal-black bg-[#FF5CAA] px-1.5" : "opacity-60"}`}>
              {limited
                ? `Limit reached · back at ${resetClock ?? "the top of the hour"}`
                : `${remaining ?? moneyLimits.whDeliveriesPerHour} of ${moneyLimits.whDeliveriesPerHour} sends left this hour`}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-5">
            {SCENARIOS.map((s) => (
              <div key={s.id} className={`flex flex-col gap-1.5 min-w-0 [&>button]:w-full ${s.id === "chaos" ? "col-span-2 md:col-span-4 lg:col-span-1" : ""}`}>
                <RunButton
                  onClick={() => play(s.id)}
                  busy={busy === s.id}
                  disabled={!session || locked || limited}
                  size="md"
                  tone={s.id === "chaos" ? "black" : s.id === "fresh" ? "yellow" : "white"}
                >
                  <T tech={s.label} plain={s.plainLabel} />
                </RunButton>
                <span className="font-mono text-[10px] leading-snug opacity-60 pl-1 h-[2lh]">
                  <T tech={s.what} plain={s.plainWhat} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Stage>

      <Note tone={error ? "bad" : "neutral"}>
        {error === "limit" ? (
          <T
            tech={`Rate limit: ${moneyLimits.whDeliveriesPerHour} sends per hour per visitor, buttons and curl combined. Resets at ${resetClock ?? "the top of the hour"}.`}
            plain={`You have used all ${moneyLimits.whDeliveriesPerHour} sends for this hour. More at ${resetClock ?? "the top of the hour"}. The limit keeps the demo database alive for everyone.`}
          />
        ) : error ? (
          error
        ) : done ? (
          <Verdict b={batch!} d={done} plain={plain} />
        ) : busy || revealing ? (
          <T tech="Delivering…" plain="Letters on their way…" />
        ) : (
          <T
            tech="Your inbox is empty. Play the provider: send one, five copies, late, forged, or all of it at once."
            plain="Your mailbox is empty. Send letters and watch what it does with each one. Chaos sends ten at once: copies, late ones and fakes."
          />
        )}
      </Note>

      <DbRows>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <RawRows<DeliveryRow>
            title="wh.deliveries — every HTTP hit on your inbox"
            rows={state.deliveries}
            empty="Nothing yet. Press a button or run the curl below."
            columns={[
              { key: "received_at", label: "At", render: (r) => new Date(r.received_at).toISOString().slice(11, 23) },
              { key: "source", label: "Via" },
              { key: "event_id", label: "Event", render: (r) => r.event_id ?? "—" },
              { key: "event_type", label: "Type", render: (r) => r.event_type?.replace("payment.", "") ?? "—" },
              { key: "result", label: "Result", render: (r) => <span className={RESULT_CLS[r.result]}>{r.result}</span> },
              { key: "latency_ms", label: "ms", align: "right" },
            ]}
          />
          <RawRows<OrderRow>
            title="wh.orders — the projection"
            rows={state.orders}
            empty="No orders in your inbox yet."
            columns={[
              { key: "order_id", label: "Order" },
              { key: "state", label: "State", render: (r) => <span className={r.state === "captured" ? "text-[#4ade80]" : ""}>{r.state}</span> },
              { key: "last_event_at", label: "Last event", render: (r) => new Date(r.last_event_at).toISOString().slice(11, 19) },
            ]}
          />
        </div>
      </DbRows>

      <TechOnly plain="Engineers can send letters to this mailbox from their own terminal. Its address, its password and the command are one click away." label="Show the command">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">Your inbox</span>
          <div className="border-[3px] border-brutal-black bg-cream p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <code className="font-mono text-[12px] break-all leading-relaxed">{inboxUrl}</code>
              <CopyButton text={inboxUrl} label="Copy" />
            </div>
            <div className="flex items-center justify-between gap-3 border-t-[2px] border-brutal-black/10 pt-3">
              <span className="font-mono text-[12px] break-all">
                <span className="text-brutal-black/60">secret </span>
                {SECRET}
              </span>
              <CopyButton text={SECRET} label="Copy" />
            </div>
          </div>
          <span className="font-mono text-[11px] text-brutal-black/60 leading-relaxed">
            Signed with HMAC-SHA256 over the raw body. The secret is public because the inbox is yours alone and the limit is {moneyLimits.whDeliveriesPerHour} sends an hour.
          </span>
          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">From your terminal</span>
            <CopyButton text={curl} label="Copy curl" />
          </div>
          <pre className="border-[3px] border-brutal-black bg-[#0a0a0a] text-cream/85 px-4 py-4 font-mono text-[11.5px] leading-relaxed overflow-x-auto">{curl}</pre>
        </div>
      </TechOnly>

      <Limits>
        <T
          tech={`Limit: ${moneyLimits.whDeliveriesPerHour} sends per hour per visitor, buttons and curl combined. Deliveries, events and orders older than 24 hours are deleted.`}
          plain={`${moneyLimits.whDeliveriesPerHour} letters an hour each. Everything is wiped after a day.`}
        />
      </Limits>
    </div>
  );
}

function Verdict({ b, d, plain }: { b: Batch; d: ReturnType<typeof tally>; plain: boolean }) {
  const n = b.letters.length;
  if (plain) {
    const parts = [
      d.accepted && `${d.accepted} accepted`,
      d.repeats && `${d.repeats} ${d.repeats === 1 ? "repeat" : "repeats"} ignored`,
      d.old && `${d.old} old news ignored`,
      d.fakes && `${d.fakes} ${d.fakes === 1 ? "fake" : "fakes"} refused`,
    ].filter(Boolean);
    const order = b.state ? `The order is ${ORDER_PLAIN[b.state]?.toLowerCase() ?? b.state}, sent ${d.sent === 1 ? "once" : `${d.sent} times`}.` : "The order was not touched.";
    const naive =
      d.naive > d.sent
        ? d.sent === 0
          ? ` A mailbox that trusts every letter would have sent it anyway, and nobody paid.`
          : ` A mailbox that trusts every letter would have sent it ${d.naive} times.`
        : "";
    return (
      <>
        {n} {n === 1 ? "letter" : "letters"}: {parts.join(", ")}. {order}
        {naive}
      </>
    );
  }
  return (
    <>
      {b.order}: {n} deliveries → {d.accepted} processed, {d.repeats} duplicate, {d.old} stale, {d.fakes} rejected. state = {b.state ?? "no row"}. fulfil() ran {d.sent}×; the naive handler
      would run it {d.naive}×.
    </>
  );
}

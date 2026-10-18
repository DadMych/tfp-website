"use client";

import { useState } from "react";
import { labPost, useLabSession } from "@/lib/lab/client";
import { errorText } from "@/components/lab/ai/rag-client";
import { euros, ownInvoice, clientName } from "@/lib/audit/invoices";
import type { OpenResult, PayResult, WebhookResult } from "@/lib/audit/cabinet";
import type { Show } from "@/lib/audit/findings";

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const btn =
  "h-10 px-4 border-[3px] border-brutal-black font-display font-black uppercase text-sm bg-brutal-yellow shadow-[3px_3px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:shadow-none";
const ghost = "h-10 px-3 border-[3px] border-brutal-black font-display font-bold text-sm bg-white hover:bg-cream disabled:opacity-50";

/** A fixed-height result shelf, so nothing on the page jumps when a run lands. */
function Shelf({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[8.5rem] border-[3px] border-brutal-black bg-white p-4 flex flex-col gap-2">{children}</div>;
}

function Row({ bad, head, children }: { bad: boolean; head: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-l-[4px] pl-3" style={{ borderColor: bad ? "#FF3B3B" : "#5BBE4F" }}>
      <span className={`${label}`} style={{ color: bad ? "#D4006A" : "#2F7D2A" }}>
        {head}
      </span>
      <div className="font-display text-[15px] leading-snug">{children}</div>
    </div>
  );
}

function Sim() {
  return (
    <p className={`${label} opacity-55`}>Simulated · this part of the system isn&apos;t in the sandbox</p>
  );
}

// ── Critical / High: live against the cabinet ────────────────────────────────

function ConfigDemo() {
  // This string really ships in the JavaScript of this page. It is a made-up key.
  const LEAKED = "eyJhbGciOiJIUzI1NiJ9.service_role.northwind-cabinet-DEMO-not-a-real-key";
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setShown(true)} className={btn}>
        Read the page&apos;s JavaScript
      </button>
      <Shelf>
        {shown ? (
          <>
            <Row bad head="Found in the browser bundle">
              <code className="font-mono text-[12px] break-all">{LEAKED}</code>
            </Row>
            <p className={`${label} opacity-70`}>
              A <span className="font-bold">service_role</span> key: full rights, ignores every per-client rule. It is in the code the page sent you. The login in front of it stops nothing.
            </p>
          </>
        ) : (
          <p className="font-display text-brutal-black/50">The key is sitting in the shipped code. Press the button to read it out.</p>
        )}
      </Shelf>
    </div>
  );
}

function InvoiceDemo() {
  const [num, setNum] = useState(ownInvoice.number.slice(-3));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<OpenResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const open = async (n = num) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      setRes(await labPost<OpenResult>("/api/lab/audit", null, { action: "invoice", invoice: `NW-2026-${n}` }));
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const step = (d: number) => {
    const n = String(Math.max(0, Number(num) + d)).padStart(3, "0");
    setNum(n);
    open(n);
  };
  const line = (p: OpenResult["careless"]) =>
    p.status === 404 ? "404 · Not found" : `${clientName(p.invoice!.client)} · ${p.invoice!.plan} · ${euros(p.invoice!.amountCents)}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[15rem] h-11 flex items-center border-[3px] border-brutal-black bg-white font-mono text-[13px] px-3 overflow-hidden">
          <span className="opacity-50 hidden sm:inline">cabinet.northwind.example</span>
          <span className="opacity-50">/invoices/NW-2026-</span>
          <input
            value={num}
            onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onKeyDown={(e) => e.key === "Enter" && open()}
            inputMode="numeric"
            aria-label="Invoice number"
            className="w-[3.5ch] font-bold bg-brutal-yellow border-b-2 border-brutal-black px-0.5 focus:outline-none"
          />
        </div>
        <button type="button" onClick={() => step(-1)} disabled={busy} className={ghost} aria-label="Previous invoice">−1</button>
        <button type="button" onClick={() => step(1)} disabled={busy} className={ghost} aria-label="Next invoice">+1</button>
        <button type="button" onClick={() => open()} disabled={busy} className={btn}>{busy ? "…" : "Open"}</button>
      </div>
      <Shelf>
        {err ? (
          <p className="font-mono text-[12px] text-[#D4006A]">{err}</p>
        ) : res ? (
          <>
            <Row bad={!res.careless.mine && res.careless.status === 200} head="Cabinet · checks you're logged in">
              {line(res.careless)}
              {!res.careless.mine && res.careless.status === 200 && <span className="font-mono text-[11px] text-[#D4006A]"> — not yours</span>}
            </Row>
            <Row bad={false} head="Fixed · checks it's yours">
              {res.careful.status === 404 ? "404 · Not found" : line(res.careful)}
            </Row>
          </>
        ) : (
          <p className="font-display text-brutal-black/50">
            You&apos;re logged in as {clientName(ownInvoice.client)}. Yours is {ownInvoice.number}. Change the number and open it.
          </p>
        )}
      </Shelf>
    </div>
  );
}

function PayDemo() {
  const session = useLabSession();
  const [taps, setTaps] = useState(2);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PayResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await labPost("/api/lab/audit", session, { action: "reset" });
      setRes(await labPost<PayResult>("/api/lab/audit", session, { action: "pay", invoice: ownInvoice.number, taps }));
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={label}>Taps on Pay</span>
        {[2, 3, 5].map((t) => (
          <button key={t} type="button" onClick={() => setTaps(t)} aria-pressed={taps === t} className={`h-9 w-9 border-[3px] border-brutal-black font-display font-black ${taps === t ? "bg-brutal-black text-cream" : "bg-white"}`}>
            {t}
          </button>
        ))}
        <button type="button" onClick={run} disabled={busy} className={btn}>{busy ? "…" : `Tap Pay ${taps}×`}</button>
      </div>
      <Shelf>
        {err ? (
          <p className="font-mono text-[12px] text-[#D4006A]">{err}</p>
        ) : res ? (
          <>
            <Row bad head="Cabinet · no key">
              Charged {res.careless.charged}× — {euros(res.careless.totalCents)} off a {euros(ownInvoice.amountCents)} invoice
            </Row>
            <Row bad={false} head="Fixed · one key per payment">
              Charged {res.careful.charged}× — {euros(res.careful.totalCents)}
            </Row>
          </>
        ) : (
          <p className="font-display text-brutal-black/50">One invoice, {ownInvoice.number} for {euros(ownInvoice.amountCents)}. Tap Pay more than once.</p>
        )}
      </Shelf>
    </div>
  );
}

function WebhookDemo() {
  const session = useLabSession();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<WebhookResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async (forged: boolean) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await labPost("/api/lab/audit", session, { action: "reset" });
      setRes(await labPost<WebhookResult>("/api/lab/audit", session, { action: "webhook", invoice: ownInvoice.number, forged }));
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const paid = (n: number) => (n > 0 ? "PAID" : "unpaid");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => run(true)} disabled={busy} className={btn}>Send a forged &quot;paid&quot;</button>
        <button type="button" onClick={() => run(false)} disabled={busy} className={ghost}>Send the real one</button>
      </div>
      <Shelf>
        {err ? (
          <p className="font-mono text-[12px] text-[#D4006A]">{err}</p>
        ) : res ? (
          <>
            <Row bad={res.careless.paid.charged > 0 && res.forged} head="Cabinet · believes any message">
              {ownInvoice.number} → {paid(res.careless.paid.charged)}{res.forged ? " — on a message with no signature" : " — real payment"}
            </Row>
            <Row bad={false} head="Fixed · checks the signature">
              {ownInvoice.number} → {paid(res.careful.paid.charged)} — {res.careful.reason}
            </Row>
          </>
        ) : (
          <p className="font-display text-brutal-black/50">The payment provider says {ownInvoice.number} is paid. Send a forged message, or the real signed one.</p>
        )}
      </Shelf>
    </div>
  );
}

function FloatDemo() {
  const [shown, setShown] = useState(false);
  // A Studio retainer pro-rated to 3 of October's 31 days. Odd cents on purpose.
  const totalCents = Math.round((580_000 * 3) / 31); // 56129
  const totalEuros = (580_000 * 3) / 31 / 100; // 561.2903...
  const floatHalf = Math.round((totalEuros / 2) * 100) / 100; // naive: round the float euros
  const floatSum = floatHalf * 2;
  const intA = Math.ceil(totalCents / 2);
  const intB = Math.floor(totalCents / 2);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setShown(true)} className={btn}>Split {euros(totalCents)} 50/50</button>
      <Shelf>
        {shown ? (
          <>
            <Row bad={floatSum !== totalCents / 100} head="Cabinet · money as a decimal">
              €{floatHalf.toFixed(2)} + €{floatHalf.toFixed(2)} = €{floatSum.toFixed(2)} — {((totalCents / 100 - floatSum) * 100).toFixed(0)}¢ short of {euros(totalCents)}
            </Row>
            <Row bad={false} head="Fixed · whole cents">
              {euros(intA)} + {euros(intB)} = {euros(intA + intB)}
            </Row>
          </>
        ) : (
          <p className="font-display text-brutal-black/50">A Studio retainer pro-rated to 3 days: {euros(totalCents)}. Split it in two.</p>
        )}
      </Shelf>
    </div>
  );
}

// ── New findings: no earlier chapter, reproduced right here ──────────────────

function RateLimitDemo() {
  const [shown, setShown] = useState(false);
  const N = 20;
  const CAP = 5;
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setShown(true)} className={btn}>Try {N} passwords in a row</button>
      <Shelf>
        {shown ? (
          <>
            <Row bad head="Cabinet · nothing counts">
              {N} of {N} attempts accepted — a guesser runs at full speed
            </Row>
            <Row bad={false} head="Fixed · counts per account and address">
              {CAP} tries, then slowed down — {N - CAP} refused
            </Row>
            <Sim />
          </>
        ) : (
          <p className="font-display text-brutal-black/50">Hit the login {N} times without stopping to see what pushes back.</p>
        )}
      </Shelf>
    </div>
  );
}

function RestoreDemo() {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setShown(true)} className={btn}>Restore last night&apos;s backup</button>
      <Shelf>
        {shown ? (
          <>
            <Row bad head="Cabinet · the backup runs, the restore doesn't">
              Backup found: 2.1 MB, dated last night. Restore → 0 of 7 tables came back: the dump never captured the schema.
            </Row>
            <Row bad={false} head="Fixed · restore on a schedule">
              Restored into a scratch database, row counts checked. A backup is real once it&apos;s been put back.
            </Row>
            <Sim />
          </>
        ) : (
          <p className="font-display text-brutal-black/50">There are nightly backups. Nobody has ever restored one. Try it.</p>
        )}
      </Shelf>
    </div>
  );
}

function LogsDemo() {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setShown(true)} className={btn}>Open the log</button>
      <Shelf>
        {shown ? (
          <>
            <Row bad head="Cabinet · the key is in the log">
              <code className="font-mono text-[12px] break-all">POST /pay 200 key=sk_live_NW_9f2c…a1 ok</code>
            </Row>
            <Row bad={false} head="Fixed · redacted before writing">
              <code className="font-mono text-[12px] break-all">POST /pay 200 key=sk_live_[redacted] ok</code>
            </Row>
            <Sim />
          </>
        ) : (
          <p className="font-display text-brutal-black/50">The cabinet logs every request. Read one line.</p>
        )}
      </Shelf>
    </div>
  );
}

function DeployDemo() {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setShown(true)} className={btn}>Ship a change</button>
      <Shelf>
        {shown ? (
          <>
            <Row bad head="Cabinet · one environment, from a laptop">
              <code className="font-mono text-[12px] break-all">git push → production</code> — no staging, no review, nothing to roll back to
            </Row>
            <Row bad={false} head="Fixed · a pipeline and a staging copy">
              Tested on staging, shipped by the pipeline, last good release kept to roll back to
            </Row>
            <Sim />
          </>
        ) : (
          <p className="font-display text-brutal-black/50">A new version goes straight onto the live site. Watch where it lands.</p>
        )}
      </Shelf>
    </div>
  );
}

const INLINE: Record<string, () => React.ReactElement> = {
  config: ConfigDemo,
  invoice: InvoiceDemo,
  pay: PayDemo,
  webhook: WebhookDemo,
  float: FloatDemo,
  ratelimit: RateLimitDemo,
  restore: RestoreDemo,
  logs: LogsDemo,
  deploy: DeployDemo,
};

export default function ShowMe({ show }: { show: Show }) {
  if (show.kind === "inline") {
    const Demo = INLINE[show.action];
    return Demo ? <Demo /> : null;
  }
  return null;
}

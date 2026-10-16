"use client";

import { useState } from "react";
import { ImplHeader, Stage, StatBox } from "./ui";
import { T } from "./Explain";

/* Everything here runs in the browser. No requests, no rows. */

const inputCls = "border-[3px] border-brutal-black bg-white px-3 py-2 font-mono text-sm w-full focus:outline-none focus:bg-brutal-yellow/40";
const labelCls = "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/55";

function Field({ label, value, onChange, type = "text", children }: { label: string; value?: string; onChange?: (v: string) => void; type?: string; children?: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      {children ?? <input type={type} inputMode="decimal" className={inputCls} value={value} onChange={(e) => onChange?.(e.target.value)} />}
    </label>
  );
}

function toCents(s: string): number | null {
  const m = s.trim().match(/^-?\d+(?:\.\d{0,2})?$/);
  if (!m) return null;
  const neg = s.trim().startsWith("-");
  const [whole, frac = ""] = s.trim().replace("-", "").split(".");
  const c = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return neg ? -c : c;
}
const fmt = (cents: number) => `${cents < 0 ? "-" : ""}$${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, "0")}`;

/* 1 · Floats */
function Floats() {
  const [a, setA] = useState("0.10");
  const [b, setB] = useState("0.20");
  const [q, setQ] = useState("3");
  const fa = Number(a);
  const fb = Number(b);
  const n = Math.max(0, Math.floor(Number(q) || 0));
  const ca = toCents(a);
  const cb = toCents(b);
  const floatSum = fa + fb;
  const floatMul = fa * n;
  // "Looks right" means the float prints the same digits the integer math gives.
  const floatOk = ca === null || cb === null || String(floatSum) === String((ca + cb) / 100);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <Field label="a" value={a} onChange={setA} />
        <Field label="b" value={b} onChange={setB} />
        <Field label="× quantity" value={q} onChange={setQ} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <ImplHeader kind="bad" title="Number (float64)" note="what JavaScript, Python and most ORMs give you by default" plainTitle="Decimals, the default way" plainNote="what most software does unless told otherwise" />
          <StatBox value={String(floatSum)} label={`a + b`} tone={floatOk ? "neutral" : "bad"} />
          <StatBox value={String(floatMul)} label={`a × ${n}`} tone={Number.isInteger(floatMul * 100) ? "neutral" : "bad"} />
        </div>
        <div className="flex flex-col gap-3">
          <ImplHeader kind="good" title="Integer cents" note="BIGINT in Postgres, number or bigint in code, format at the edge" plainTitle="Count in cents" plainNote="whole numbers only; the dot is added when a person looks" />
          <StatBox value={ca !== null && cb !== null ? `${ca + cb} ¢ = ${fmt(ca + cb)}` : "not money"} label="a + b" tone={ca === null || cb === null ? "warn" : "good"} />
          <StatBox value={ca !== null ? `${ca * n} ¢ = ${fmt(ca * n)}` : "not money"} label={`a × ${n}`} tone={ca === null ? "warn" : "good"} />
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-brutal-black/60 max-w-2xl">
        <T
          tech="0.1 has no exact binary representation, so 0.1 + 0.2 is 0.30000000000000004. One payment will not show it. A month of them, summed and compared to the bank, will. Store the smallest unit as an integer and let nothing else near the arithmetic."
          plain="Computers store 0.10 only approximately. One payment hides it; a month of them, added up and compared with the bank, does not. Count in whole cents and the problem disappears."
        />
      </p>
    </div>
  );
}

/* 2 · Splits */
function splitLargestRemainder(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  let rem = total - base * n;
  return Array.from({ length: n }, () => base + (rem-- > 0 ? 1 : 0));
}
function Splits() {
  const [total, setTotal] = useState("100.00");
  const [parts, setParts] = useState("3");
  const cents = toCents(total) ?? 0;
  const n = Math.min(12, Math.max(1, Math.floor(Number(parts) || 1)));
  const naiveEach = Math.round(cents / n);
  const naiveSum = naiveEach * n;
  const good = splitLargestRemainder(cents, n);
  const goodSum = good.reduce((s, x) => s + x, 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Field label="Total" value={total} onChange={setTotal} />
        <Field label="Recipients (1–12)" value={parts} onChange={setParts} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <ImplHeader kind="bad" title="round(total / n) each" note="the obvious line of code" plainTitle="Divide, then round" plainNote="the obvious way" />
          <div className="flex flex-wrap content-start gap-1.5 h-[6.5rem] overflow-hidden">
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className="border-[2px] border-brutal-black bg-white px-2 py-1 font-mono text-xs">
                {fmt(naiveEach)}
              </span>
            ))}
          </div>
          <StatBox
            value={fmt(naiveSum)}
            label={<T tech="Sum of parts" plain="Adds up to" />}
            tone={naiveSum === cents ? "neutral" : "bad"}
            sub={naiveSum === cents ? "matches, this time" : `${naiveSum > cents ? "+" : "−"}${fmt(Math.abs(naiveSum - cents))} vs total`}
          />
        </div>
        <div className="flex flex-col gap-3">
          <ImplHeader kind="good" title="Largest remainder" note="floor for all, then hand the leftover cents out one each" plainTitle="Hand out the leftover cents" plainNote="everyone gets the same, then the spare cents go one each" />
          <div className="flex flex-wrap content-start gap-1.5 h-[6.5rem] overflow-hidden">
            {good.map((c, i) => (
              <span key={i} className={`border-[2px] border-brutal-black px-2 py-1 font-mono text-xs ${c !== good[good.length - 1] ? "bg-brutal-yellow" : "bg-white"}`}>
                {fmt(c)}
              </span>
            ))}
          </div>
          <StatBox value={fmt(goodSum)} label={<T tech="Sum of parts" plain="Adds up to" />} tone="good" sub="always equals total" />
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-brutal-black/60 max-w-2xl">
        <T
          tech="Marketplace payouts, split bills, tax lines, revenue share. Someone has to get the extra cent, and the rule for who has to be written down and deterministic, or two systems will disagree on it."
          plain="Whenever money is split — payouts, shared bills, tax lines — someone has to get the extra cent. Decide who, write it down, and every system will agree."
        />
      </p>
    </div>
  );
}

/* 3 · Minor units */
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "KWD", "BHD", "CLP", "TND"] as const;
function minorDigits(code: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
}
function MinorUnits() {
  const [amount, setAmount] = useState("1234.5");
  const [cur, setCur] = useState<(typeof CURRENCIES)[number]>("USD");
  const d = minorDigits(cur);
  const v = Number(amount);
  const ok = Number.isFinite(v);
  const minor = ok ? Math.round(v * 10 ** d) : 0;
  const wrong = ok ? Math.round(v * 100) : 0;
  const display = ok ? new Intl.NumberFormat("en", { style: "currency", currency: cur }).format(minor / 10 ** d) : "—";
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Field label="Amount as typed" value={amount} onChange={setAmount} />
        <Field label="Currency">
          <select className={inputCls} value={cur} onChange={(e) => setCur(e.target.value as (typeof CURRENCIES)[number])}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatBox value={String(d)} label={<T tech="Minor unit digits" plain="Decimal places" />} sub={<T tech={`per ISO 4217 for ${cur}`} plain={`for ${cur}`} />} />
        <StatBox value={ok ? `${minor} ${cur === "JPY" || cur === "CLP" ? "" : "minor"}`.trim() : "—"} label={<T tech="Store this integer" plain="Store this number" />} tone="good" sub={display} />
        <StatBox
          value={ok ? String(wrong) : "—"}
          label={<T tech={'"× 100" would store'} plain="Assuming cents would store" />}
          tone={d === 2 ? "neutral" : "bad"}
          sub={d === 2 ? "same, for two-digit currencies" : d === 0 ? `100× too much for ${cur}` : `10× too little for ${cur}`}
        />
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-brutal-black/60 max-w-2xl">
        <T
          tech="“Multiply by 100” is a USD assumption. Yen has no minor unit; a Kuwaiti dinar has three. Providers already speak minor units, so the bug lands on the day you add the first non-two-digit currency and the payouts come out a hundred times too large."
          plain="“Multiply by 100” assumes every currency has cents. Yen has none; the Kuwaiti dinar has three decimals. Get it wrong and the day you add such a currency, payouts come out a hundred times too large."
        />
      </p>
    </div>
  );
}

/* 4 · Fee rounding */
function Fees() {
  const [count, setCount] = useState("100");
  const [price, setPrice] = useState("0.99");
  const [pct, setPct] = useState("2.9");
  const [fixed, setFixed] = useState("0.30");
  const n = Math.min(100000, Math.max(1, Math.floor(Number(count) || 1)));
  const p = toCents(price) ?? 0;
  const f = toCents(fixed) ?? 0;
  const bps = Math.round((Number(pct) || 0) * 100); // basis points
  const feeOne = Math.round((p * bps) / 10000) + f;
  const perTx = feeOne * n;
  const aggregate = Math.round((p * n * bps) / 10000) + f * n;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Payments" value={count} onChange={setCount} />
        <Field label="Price each" value={price} onChange={setPrice} />
        <Field label="Fee %" value={pct} onChange={setPct} />
        <Field label="Fee fixed" value={fixed} onChange={setFixed} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatBox value={fmt(perTx)} label={<T tech="Fee, rounded per payment" plain="Fee, rounded on each payment" />} sub={<T tech="what the provider charges" plain="what the card company charges" />} />
        <StatBox value={fmt(aggregate)} label="Fee, rounded on the total" sub="what a monthly report computes" />
        <StatBox value={fmt(perTx - aggregate)} label="Gap" tone={perTx === aggregate ? "neutral" : "warn"} sub="unexplained until someone reads the contract" />
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-brutal-black/60 max-w-2xl">
        <T
          tech="Both numbers are correct. They answer different questions. Round where the contract says rounding happens, store the rounded value, and never recompute a fee from a total."
          plain="Both numbers are right; they answer different questions. Decide where rounding happens, store that number, and never work a fee out again from a total."
        />
      </p>
    </div>
  );
}

export default function MoneyMathDemo() {
  const tabs = [
    { id: "floats", label: <T tech="Floats" plain="Decimals" />, el: <Floats /> },
    { id: "splits", label: <T tech="Splits" plain="Splitting a bill" />, el: <Splits /> },
    { id: "minor", label: <T tech="Minor units" plain="Other currencies" />, el: <MinorUnits /> },
    { id: "fees", label: <T tech="Fee rounding" plain="Rounding fees" />, el: <Fees /> },
  ];
  const [tab, setTab] = useState("floats");
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Money math topics" className="inline-flex flex-wrap border-[3px] border-brutal-black w-fit bg-white shadow-[5px_5px_0_0_#000]">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-5 h-12 font-display font-black uppercase tracking-[-0.02em] text-base transition-colors ${
              tab === t.id ? "bg-brutal-yellow" : "hover:bg-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Stage className="h-[960px] md:h-[580px] overflow-hidden flex flex-col justify-center">
        <div role="tabpanel">{tabs.find((t) => t.id === tab)?.el}</div>
      </Stage>
    </div>
  );
}

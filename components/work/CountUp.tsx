"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Splits "~30k" into { prefix: "~", number: 30, suffix: "k", decimals: 0 }.
 * Only symbol prefixes count, so "Nov 2026" stays static.
 */
function parse(value: string) {
  const m = value.match(/^([~$€£+<>≈-]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const decimals = (m[2].split(".")[1] ?? "").length;
  return { prefix: m[1], number: parseFloat(m[2].replace(/,/g, "")), suffix: m[3], decimals, commas: m[2].includes(",") };
}

const DURATION = 900;

/**
 * Counts a leading number up from zero when the element enters the viewport.
 * Non-numeric values and prefers-reduced-motion render the final value at once.
 */
export default function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const parsed = parse(value);
  const ref = useRef<HTMLSpanElement>(null);
  // Server renders the final value; the client resets to 0 and animates in.
  const [shown, setShown] = useState<number | null>(parsed ? parsed.number : null);

  useEffect(() => {
    if (!parsed) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setShown(0);
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION);
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(parsed.number * eased);
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
    // parsed is derived from value; value is stable per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!parsed || shown === null) {
    return <span className={className}>{value}</span>;
  }

  const n = parsed.commas ? shown.toLocaleString("en-US", { minimumFractionDigits: parsed.decimals, maximumFractionDigits: parsed.decimals }) : shown.toFixed(parsed.decimals);
  const text = `${parsed.prefix}${n}${parsed.suffix}`;

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

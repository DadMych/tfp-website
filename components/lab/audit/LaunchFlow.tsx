"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { FINDINGS, SEVERITY, type Severity } from "@/lib/audit/findings";
import { BAD_MONTH, BAD_TOTAL, PRESS, scenarioAt } from "@/lib/audit/story";
import { labPost } from "@/lib/lab/client";
import { siteConfig } from "@/lib/data";

const mono = "font-mono font-bold uppercase";
const sevOf = (id?: string): Severity | undefined => (id ? FINDINGS.find((f) => f.id === id)?.severity : undefined);
const eur = (n: number) => `€${n.toLocaleString("en-US")}`;

// ── count-up ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, reduce: boolean, ms = 650) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduce) {
      from.current = target;
      setVal(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(a + (target - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce, ms]);
  return val;
}

function Counter({ value, label, hot }: { value: string; label: string; hot: boolean }) {
  return (
    <div className={`border-[3px] px-3 py-2 flex flex-col gap-0.5 ${hot ? "border-[#FF3B3B] bg-[#FF3B3B]/15" : "border-cream/25"}`}>
      <span className={`font-display font-black text-2xl md:text-3xl leading-none tabular-nums ${hot ? "text-[#FF6B6B]" : "text-cream"}`}>{value}</span>
      <span className={`${mono} text-[9px] tracking-[0.12em] leading-tight ${hot ? "text-[#FF6B6B]/80" : "text-cream/45"}`}>{label}</span>
    </div>
  );
}

// ── the film ─────────────────────────────────────────────────────────────────

export default function LaunchFlow() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "live">("idle");
  const [shown, setShown] = useState(0); // incidents revealed
  const [flashes, setFlashes] = useState<number[]>([]);
  const controls = useAnimationControls();
  const stageRef = useRef<HTMLDivElement>(null);

  const total = BAD_MONTH.length;
  const done = phase === "live" && shown >= total;
  const current = shown > 0 ? BAD_MONTH[shown - 1] : null;
  const day = current ? current.day : 1;

  const totals = scenarioAt(BAD_MONTH, shown - 1);
  const euros = useCountUp(totals.euros, !!reduce);
  const clients = useCountUp(totals.clients, !!reduce);
  const lawyers = useCountUp(totals.lawyers, !!reduce);

  // Drive the month forward; accelerating. Reduced motion lands it all at once.
  useEffect(() => {
    if (phase !== "live") return;
    if (reduce) {
      if (shown !== total) setShown(total);
      return;
    }
    if (shown >= total) return;
    const gap = shown === 0 ? 1800 : Math.max(700, 1500 - shown * 70);
    const t = setTimeout(() => {
      const sev = sevOf(BAD_MONTH[shown]?.findingId);
      if (sev === "critical") {
        controls.start({ x: [0, -14, 14, -9, 9, -4, 4, 0], transition: { duration: 0.5 } });
        setFlashes((f) => [...f, Date.now()]);
      }
      setShown((n) => n + 1);
    }, gap);
    return () => clearTimeout(t);
  }, [phase, shown, reduce, controls, total]);

  // Keep the log scrolled to the newest line.
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [shown, reduce]);

  const start = () => {
    labPost("/api/lab/audit", null, { action: "launch" }).catch(() => {});
    setPhase("live");
    setShown(0);
  };
  const replay = () => {
    setShown(0);
    setFlashes([]);
    setPhase("idle");
  };

  const chaos = shown / total; // 0 → 1

  // ── idle: one red button ─────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-4 max-w-3xl">
          <span className={`${mono} text-[11px] tracking-[0.25em] text-brutal-black/60`}>Part 5 · Northwind gets audited</span>
          <h1 className="font-display font-black uppercase tracking-[-0.04em] leading-[0.86]" style={{ fontSize: "clamp(2.4rem, 7vw, 5.5rem)" }}>
            The cabinet works
            <br />
            in the demo.
          </h1>
          <p className="font-display text-lg md:text-xl leading-snug text-brutal-black/75">
            Someone built Northwind a client cabinet in two weeks — invoices, payments, a help bot. Two weeks of work, and it passed every click in the demo. So: ship it?
          </p>
        </div>
        <motion.button
          type="button"
          onClick={start}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group w-full md:w-auto md:self-start border-[4px] border-brutal-black bg-[#FF3B3B] text-cream font-display font-black uppercase tracking-[-0.01em] px-10 py-7 text-4xl md:text-6xl shadow-[10px_10px_0_0_#000] active:translate-x-[5px] active:translate-y-[5px] active:shadow-[5px_5px_0_0_#000]"
        >
          <span className="flex items-center justify-center gap-4">
            <span className={reduce ? "" : "animate-pulse"} aria-hidden="true">
              ●
            </span>
            Launch anyway
          </span>
        </motion.button>
        <p className={`${mono} text-[11px] tracking-[0.2em] text-brutal-black/40`}>No reading required. Watch the month after.</p>
      </div>
    );
  }

  // ── live: the stage ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">
      {/* full-screen red flashes on criticals */}
      <AnimatePresence>
        {flashes.map((id) => (
          <motion.div
            key={id}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onAnimationComplete={() => setFlashes((f) => f.filter((x) => x !== id))}
            className="pointer-events-none fixed inset-0 z-50 bg-[#FF3B3B]"
            style={{ mixBlendMode: "multiply" }}
            aria-hidden="true"
          />
        ))}
      </AnimatePresence>

      <motion.div
        ref={stageRef}
        animate={controls}
        className="relative overflow-hidden border-[4px] border-brutal-black shadow-[8px_8px_0_0_#000]"
        style={{ background: "#0C0C0C" }}
      >
        {/* rising red as the month unravels */}
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-700" style={{ background: "radial-gradient(130% 90% at 50% 120%, #FF3B3B 0%, transparent 70%)", opacity: 0.08 + chaos * 0.4 }} aria-hidden="true" />

        <div className="relative flex flex-col gap-4 p-4 md:p-6">
          {/* top: live + day + counters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              <span className={`${mono} text-[11px] tracking-[0.25em] inline-flex items-center gap-2 ${done ? "text-cream/50" : "text-[#FF6B6B]"}`}>
                <span className={done || reduce ? "" : "animate-pulse"} aria-hidden="true">●</span>
                {done ? "Offline" : "Live"}
              </span>
              <span className="font-display font-black text-cream text-4xl md:text-6xl leading-none tabular-nums">
                Day {day}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 md:w-auto" aria-live="polite">
              <Counter value={eur(euros)} label="refunded / missing" hot={euros > 0} />
              <Counter value={String(clients)} label="clients upset" hot={clients > 0} />
              <Counter value={String(lawyers)} label="lawyers" hot={lawyers > 0} />
            </div>
          </div>

          {/* month progress */}
          <div className="h-[6px] w-full bg-cream/15">
            <motion.div className="h-full bg-[#FF3B3B]" animate={{ width: `${Math.round(chaos * 100)}%` }} transition={{ duration: reduce ? 0 : 0.4 }} />
          </div>

          {/* the headline incident */}
          <div className="min-h-[9.5rem] md:min-h-[8.5rem]">
            <AnimatePresence mode="wait">
              {current ? (
                <motion.div
                  key={shown}
                  initial={reduce ? false : { opacity: 0, y: 26, rotate: -1.2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -14 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className="border-[3px] p-4 md:p-5 flex flex-col gap-2 bg-cream"
                  style={{ borderColor: SEVERITY[sevOf(current.findingId) ?? "medium"].bg }}
                >
                  <span className={`${mono} text-[10px] tracking-[0.15em] flex flex-wrap items-center gap-2 text-brutal-black/55`}>
                    <span className="px-2 py-0.5 text-cream" style={{ background: SEVERITY[sevOf(current.findingId) ?? "medium"].bg, color: SEVERITY[sevOf(current.findingId) ?? "medium"].ink }}>
                      {SEVERITY[sevOf(current.findingId) ?? "medium"].label}
                    </span>
                    <span>Day {current.day}</span>
                    <span className="text-brutal-black/40">· {current.from}, {current.role}</span>
                  </span>
                  <p className="font-display font-bold text-lg md:text-2xl leading-tight text-brutal-black">{current.text}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="honeymoon"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-[3px] border-[#5BBE4F] p-4 md:p-5 flex flex-col gap-2 bg-cream"
                >
                  <span className={`${mono} text-[10px] tracking-[0.15em] text-[#2F7D2A]`}>Day 1 · Launch</span>
                  <p className="font-display font-bold text-lg md:text-2xl leading-tight text-brutal-black">
                    Northwind&apos;s cabinet is live. Invoices load, payments go through, the bot answers. Everything works.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* the pile */}
          <div ref={log} className="flex flex-col gap-1.5 max-h-[34vh] md:max-h-[280px] overflow-y-auto pr-1">
            {BAD_MONTH.slice(0, shown).map((m, i) => {
              const sev = sevOf(m.findingId) ?? "medium";
              return (
                <div key={i} className="flex items-center gap-2 border-l-[4px] pl-2.5 py-1" style={{ borderColor: SEVERITY[sev].bg }}>
                  <span className={`${mono} text-[9px] tracking-[0.1em] text-cream/35 w-10 flex-shrink-0`}>Day {m.day}</span>
                  <span className="font-display text-[13px] leading-snug text-cream/70 truncate">{m.text}</span>
                </div>
              );
            })}
          </div>

          {!done && (
            <button type="button" onClick={() => setShown(total)} className={`${mono} w-fit text-[11px] tracking-[0.2em] text-cream/45 hover:text-cream underline underline-offset-4`}>
              Skip to the end →
            </button>
          )}
        </div>

        {/* freeze overlay once the month is over */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center backdrop-blur-[2px]"
            >
              <span className={`${mono} text-[11px] tracking-[0.3em] text-cream/55`}>One month later</span>
              <p className="font-display font-black uppercase tracking-[-0.03em] leading-[0.9] text-cream text-3xl md:text-6xl">
                {eur(BAD_TOTAL.euros)} gone.
              </p>
              <p className="font-display font-bold text-cream/80 text-base md:text-xl leading-snug max-w-xl">
                {BAD_TOTAL.clients} clients furious. {BAD_TOTAL.lawyers} lawyers. {PRESS > 0 ? "A journalist chasing a leak. " : ""}Nothing was hacked — every one of these was in the code the day you pressed launch.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* the turn — rises once it's over */}
      <AnimatePresence>
        {done && (
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.3 }}
            className="border-[4px] border-brutal-black bg-brutal-yellow p-6 md:p-8 flex flex-col gap-5 shadow-[8px_8px_0_0_#000]"
          >
            <div className="flex flex-col gap-2 max-w-3xl">
              <span className={`${mono} text-[11px] tracking-[0.25em] text-brutal-black/55`}>Afraid this is your launch?</span>
              <h2 className="font-display font-black uppercase tracking-[-0.03em] leading-[0.92] text-3xl md:text-5xl">
                I find these before they ship.
              </h2>
              <p className="font-display text-base md:text-lg leading-snug text-brutal-black/80">
                A week before this launch, I&apos;d have handed Northwind every one of these in writing — ranked, with the fix. Five working days. That month would have been quiet.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/review" className="inline-flex items-center border-[3px] border-brutal-black bg-brutal-black text-cream font-display font-black uppercase tracking-[-0.01em] px-6 py-3.5 text-base md:text-lg shadow-[5px_5px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
                Get the audit · from €3,300
              </Link>
              <a href={siteConfig.calendlyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center border-[3px] border-brutal-black bg-white font-display font-black uppercase tracking-[-0.01em] px-6 py-3.5 text-base md:text-lg hover:bg-cream">
                Book a free call
              </a>
            </div>
            <div className={`${mono} flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] tracking-[0.2em] pt-1`}>
              <Link href="/lab/audit/report" className="border-b-[3px] border-brutal-black hover:bg-white">
                See the full report on this cabinet →
              </Link>
              <button type="button" onClick={replay} className="border-b-[3px] border-brutal-black hover:bg-white">
                ⟲ Replay
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

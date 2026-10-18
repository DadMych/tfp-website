"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FINDINGS, SEVERITY } from "@/lib/audit/findings";
import { BAD_MONTH, BAD_TOTAL, QUIET_MONTH, REWIND_FIXED, scenarioAt, type FeedMsg } from "@/lib/audit/story";
import { labPost } from "@/lib/lab/client";
import ShowMe from "./ShowMe";

const STEP_MS = 1200;
const byId = Object.fromEntries(FINDINGS.map((f) => [f.id, f]));
const label = "font-mono text-[11px] font-bold uppercase tracking-[0.25em]";

type Phase = "idle" | "bad" | "rewind" | "quiet";

const eur = (n: number) => `€${n.toLocaleString("en-US")}`;

// ── Counters bar ─────────────────────────────────────────────────────────────

function Counters({ euros, clients, lawyers }: { euros: number; clients: number; lawyers: number }) {
  const cells = [
    { v: eur(euros), label: "refunded or missing", w: "7ch" },
    { v: String(clients), label: "clients upset", w: "2ch" },
    { v: String(lawyers), label: "lawyers involved", w: "2ch" },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`${label} text-brutal-black/55`}>Scenario · what would have happened</span>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="border-[3px] border-brutal-black bg-white px-3 py-2.5 flex flex-col gap-1">
            <span className="font-display font-black text-2xl md:text-3xl leading-none tabular-nums" style={{ minWidth: c.w }}>
              {c.v}
            </span>
            <span className="font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] text-brutal-black/55 leading-tight">
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── One feed message ─────────────────────────────────────────────────────────

function Message({ m, open, onToggle }: { m: FeedMsg; open: boolean; onToggle: () => void }) {
  const f = m.findingId ? byId[m.findingId] : undefined;
  const tappable = Boolean(f);
  return (
    <div className="border-[3px] border-brutal-black bg-white">
      <button
        type="button"
        onClick={tappable ? onToggle : undefined}
        aria-expanded={tappable ? open : undefined}
        className={`w-full text-left p-3 flex flex-col gap-1 ${tappable ? "hover:bg-cream cursor-pointer" : "cursor-default"}`}
      >
        <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-brutal-black/50">
          <span className="bg-brutal-black text-cream px-1.5 py-0.5">Day {m.day}</span>
          <span>{m.from}</span>
          <span className="text-brutal-black/35">· {m.role}</span>
          {tappable && <span className="ml-auto text-brutal-black/60">{open ? "Hide" : "Show me"}</span>}
        </span>
        <span className="font-display text-[15px] md:text-base leading-snug">{m.text}</span>
      </button>
      {tappable && open && f && (
        <div className="border-t-[3px] border-brutal-black bg-cream p-3 flex flex-col gap-3 max-h-[20rem] overflow-y-auto">
          <p className="font-display text-sm leading-snug text-brutal-black/80">
            <span className={`${label} text-brutal-black/55`}>Why </span>
            {f.whatPlain}
          </p>
          {f.show.kind === "inline" ? (
            <ShowMe show={f.show} />
          ) : (
            f.chapter && (
              <Link
                href={f.chapter.href}
                className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.2em] border-b-[3px] border-brutal-black hover:bg-brutal-yellow"
              >
                See it in Part {f.chapter.n}: {f.chapter.label} →
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Feed panel ───────────────────────────────────────────────────────────────

function Feed({
  messages,
  revealed,
  onSkip,
  openIdx,
  setOpenIdx,
}: {
  messages: FeedMsg[];
  revealed: number;
  onSkip: () => void;
  openIdx: number | null;
  setOpenIdx: (i: number | null) => void;
}) {
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const done = revealed >= messages.length;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [revealed, openIdx, reduce]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={scroller}
        className="border-[3px] border-brutal-black bg-cream p-2 md:p-3 overflow-y-auto flex flex-col gap-2 h-[60vh] md:h-[520px]"
        aria-live="polite"
      >
        {messages.slice(0, revealed).map((m, i) => {
          const inner = (
            <Message key={i} m={m} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
          );
          return reduce ? (
            <div key={i}>{inner}</div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {inner}
            </motion.div>
          );
        })}
      </div>
      {!done && (
        <button type="button" onClick={onSkip} className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brutal-black/50 hover:text-brutal-black underline underline-offset-4">
          Skip to the end →
        </button>
      )}
    </div>
  );
}

// ── The flow ─────────────────────────────────────────────────────────────────

export default function LaunchFlow() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [revealed, setRevealed] = useState(0);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [shake, setShake] = useState(false);

  const messages = phase === "quiet" ? QUIET_MONTH : BAD_MONTH;
  const playing = phase === "bad" || phase === "quiet";
  const done = playing && revealed >= messages.length;

  // Timed reveal; reduced motion shows everything at once.
  useEffect(() => {
    if (!playing) return;
    if (reduce) {
      setRevealed(messages.length);
      return;
    }
    if (revealed >= messages.length) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), revealed === 0 ? 300 : STEP_MS);
    return () => clearTimeout(t);
  }, [playing, revealed, reduce, messages.length]);

  const enter = useCallback((p: Phase) => {
    setOpenIdx(null);
    setRevealed(0);
    setPhase(p);
  }, []);

  const launch = useCallback(
    (p: "bad" | "quiet") => {
      labPost("/api/lab/audit", null, { action: "launch" }).catch(() => {});
      if (reduce) {
        enter(p);
        return;
      }
      setShake(true);
      setTimeout(() => {
        setShake(false);
        enter(p);
      }, 420);
    },
    [enter, reduce]
  );

  const totals = playing && phase === "bad" ? scenarioAt(messages, revealed - 1) : { euros: 0, clients: 0, lawyers: 0 };

  // ── idle: the one red button ───────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-4 max-w-3xl">
          <span className={`${label} text-brutal-black/60`}>Part 5 · Northwind gets audited</span>
          <h1 className="font-display font-black uppercase tracking-[-0.04em] leading-[0.88]" style={{ fontSize: "clamp(2.4rem, 6.5vw, 5rem)" }}>
            The cabinet works in the demo. Launch it?
          </h1>
          <p className="font-display text-lg md:text-xl leading-snug text-brutal-black/75">
            Someone built Northwind a client cabinet in two weeks: invoices, payments, a help bot. It works in the demo.
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => launch("bad")}
          animate={shake && !reduce ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-full md:w-auto md:self-start border-[4px] border-brutal-black bg-[#FF3B3B] text-cream font-display font-black uppercase tracking-[-0.01em] px-10 py-6 text-3xl md:text-5xl shadow-[8px_8px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[4px_4px_0_0_#000]"
        >
          Launch anyway
        </motion.button>
      </div>
    );
  }

  // ── rewind card ──────────────────────────────────────────────────────────────
  if (phase === "rewind") {
    const fixed = REWIND_FIXED.map((id) => byId[id]).filter(Boolean);
    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <div className="border-[3px] border-brutal-black bg-brutal-yellow p-6 md:p-7 flex flex-col gap-4 shadow-[6px_6px_0_0_#000]">
          <span className={`${label} text-brutal-black/60`}>Rewind a month</span>
          <h2 className="font-display font-black uppercase tracking-[-0.03em] leading-[0.95] text-2xl md:text-4xl">
            A week before launch, I did the audit.
          </h2>
          <p className="font-display text-base md:text-lg leading-snug">
            Fixed before launch: <span className="font-black">6</span> — three critical, three high. Scheduled for week one: <span className="font-black">6</span>.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fixed.map((f) => (
              <li key={f.id}>
                <Link
                  href={f.chapter?.href ?? "/lab/audit/report"}
                  className="flex items-center gap-2 border-[3px] border-brutal-black bg-white px-3 py-2 font-display font-bold text-sm leading-snug hover:bg-cream"
                >
                  <span className="w-2.5 h-2.5 flex-shrink-0" style={{ background: SEVERITY[f.severity].bg, border: "2px solid #000" }} />
                  {f.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/lab/audit/report" className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.2em] border-b-[3px] border-brutal-black hover:bg-white">
            Read the full report →
          </Link>
        </div>
        <motion.button
          type="button"
          onClick={() => launch("quiet")}
          animate={shake && !reduce ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-full md:w-auto md:self-start border-[4px] border-brutal-black bg-brutal-black text-cream font-display font-black uppercase tracking-[-0.01em] px-10 py-5 text-2xl md:text-4xl shadow-[8px_8px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[4px_4px_0_0_#000]"
        >
          Launch
        </motion.button>
      </div>
    );
  }

  // ── playing: bad or quiet ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className={`${label} text-brutal-black/60`}>{phase === "bad" ? "The month after you launch" : "The month after the audit"}</span>
      </div>

      <Counters euros={totals.euros} clients={totals.clients} lawyers={totals.lawyers} />

      <Feed messages={messages} revealed={revealed} onSkip={() => setRevealed(messages.length)} openIdx={openIdx} setOpenIdx={setOpenIdx} />

      {done && phase === "bad" && (
        <div className="border-[3px] border-brutal-black bg-brutal-black text-cream p-6 flex flex-col gap-4 shadow-[6px_6px_0_0_#000]">
          <p className="font-display font-black uppercase tracking-[-0.02em] text-xl md:text-3xl leading-[0.95]">
            One month. {eur(BAD_TOTAL.euros)} refunded or missing. {BAD_TOTAL.clients} clients upset. {BAD_TOTAL.lawyers} lawyers.
          </p>
          <button
            type="button"
            onClick={() => enter("rewind")}
            className="w-fit border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-[-0.01em] px-6 py-3 text-lg md:text-xl active:translate-x-[3px] active:translate-y-[3px]"
          >
            ⟲ Rewind a month
          </button>
        </div>
      )}

      {done && phase === "quiet" && (
        <div className="border-[3px] border-brutal-black bg-[#C6FF3D] p-6 flex flex-col gap-3 shadow-[6px_6px_0_0_#000]">
          <p className="font-display font-black uppercase tracking-[-0.02em] text-xl md:text-3xl leading-[0.95]">
            A quiet month. Nobody noticed anything. That&apos;s the point.
          </p>
          <p className="font-display text-base leading-snug text-brutal-black/75">
            Counters stayed at €0 · 0 · 0. The difference was six fixes and one week.
          </p>
          <a href="#self-check" className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.2em] border-b-[3px] border-brutal-black hover:bg-white">
            Is yours like this? ↓
          </a>
        </div>
      )}
    </div>
  );
}

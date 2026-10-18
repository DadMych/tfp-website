"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/lab/glossary";

/* ── Explain mode: one switch that swaps every label from SQL to plain speech ── */

const KEY = "tfp-lab-explain";
const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read(): boolean {
  if (cached === null) cached = typeof window === "undefined" || window.localStorage.getItem(KEY) !== "0";
  return cached;
}
function write(v: boolean) {
  cached = v;
  window.localStorage.setItem(KEY, v ? "1" : "0");
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const Ctx = createContext<{ plain: boolean; setPlain: (v: boolean) => void }>({ plain: true, setPlain: () => {} });

export function ExplainProvider({ children }: { children: React.ReactNode }) {
  const plain = useSyncExternalStore(subscribe, read, () => true);
  const setPlain = useCallback((v: boolean) => write(v), []);
  return <Ctx.Provider value={{ plain, setPlain }}>{children}</Ctx.Provider>;
}

export function useExplain() {
  return useContext(Ctx);
}

/** Renders the plain or the technical version of a label. */
export function T({ tech, plain }: { tech: React.ReactNode; plain: React.ReactNode }) {
  const { plain: p } = useExplain();
  return <>{p ? plain : tech}</>;
}

export function ExplainToggle({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  const { plain, setPlain } = useExplain();
  const dark = tone === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={plain}
      onClick={() => setPlain(!plain)}
      className={`inline-flex items-center gap-3 border-[3px] ${compact ? "px-2 py-1.5" : "px-3 py-2"} font-mono text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${
        dark ? "border-cream/40 text-cream hover:border-cream" : "border-brutal-black bg-white hover:bg-brutal-yellow"
      }`}
    >
      <span className={`relative inline-block w-8 h-4 border-[2px] ${dark ? "border-cream" : "border-brutal-black"}`} aria-hidden="true">
        <span
          className={`absolute top-0 bottom-0 w-3 transition-[left] duration-150 ${plain ? "left-[14px] bg-brutal-yellow" : "left-0 " + (dark ? "bg-cream" : "bg-brutal-black")}`}
        />
      </span>
      {compact ? (
        <>
          <span className="sm:hidden">{plain ? "Plain" : "Tech"}</span>
          <span className="hidden sm:inline">{plain ? "Plain English" : "Engineer mode"}</span>
        </>
      ) : plain ? (
        "Plain English"
      ) : (
        "Engineer mode"
      )}
    </button>
  );
}

/** Engineer-only content. In Plain English it is replaced by one sentence, with the original one click away. */
export function TechOnly({ plain, label = "Show the code anyway", children }: { plain: React.ReactNode; label?: string; children: React.ReactNode }) {
  const { plain: p } = useExplain();
  if (!p) return <>{children}</>;
  return (
    <div className="flex flex-col gap-4">
      <p className="border-[3px] border-brutal-black bg-brutal-black text-cream shadow-[5px_5px_0_0_#000] px-5 py-4 font-display font-bold text-base md:text-lg leading-snug">{plain}</p>
      <details className="group">
        <summary className="cursor-pointer list-none w-fit font-mono text-[11px] font-bold uppercase tracking-[0.2em] underline decoration-dotted underline-offset-4 [&::-webkit-details-marker]:hidden">
          {label} <span aria-hidden="true" className="inline-block group-open:rotate-180">↓</span>
        </summary>
        <div className="mt-4">{children}</div>
      </details>
    </div>
  );
}

/** Raw database tables: open in Engineer mode, folded in Plain English. */
export function DbRows({ children }: { children: React.ReactNode }) {
  const { plain } = useExplain();
  if (!plain) return <>{children}</>;
  return (
    <details className="group border-[3px] border-brutal-black bg-white text-brutal-black">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 font-display font-bold text-base hover:bg-brutal-yellow transition-colors [&::-webkit-details-marker]:hidden">
        <span>What the database wrote down, row by row</span>
        <span aria-hidden="true" className="font-mono text-2xl leading-none transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="p-4 border-t-[3px] border-brutal-black">{children}</div>
    </details>
  );
}

/* ── Term: dotted word with a tap/click popover from the glossary ── */

export function Term({ k, children, tone = "light" }: { k: GlossaryKey; children?: React.ReactNode; tone?: "light" | "dark" }) {
  const g = GLOSSARY[k];
  const { plain } = useExplain();
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dark = tone === "dark";
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`inline border-b-[2px] border-dotted ${dark ? "border-brutal-yellow/70 hover:border-brutal-yellow" : "border-brutal-black/50 hover:border-brutal-black"} cursor-help text-left`}
      >
        {children ?? g.term}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-30 left-0 top-full mt-2 w-[min(20rem,80vw)] border-[3px] p-3 font-mono text-[11px] leading-relaxed normal-case tracking-normal font-normal ${
            dark ? "border-cream bg-[#111] text-cream shadow-[4px_4px_0_0_#FFE600]" : "border-brutal-black bg-white text-brutal-black shadow-brutal-sm"
          }`}
        >
          <span className="block font-bold uppercase tracking-[0.2em] text-[10px] mb-1 opacity-70">{g.term}</span>
          {plain ? g.plain : g.tech}
          <span className="block mt-2 opacity-60">{plain ? g.tech : g.plain}</span>
        </span>
      )}
    </span>
  );
}

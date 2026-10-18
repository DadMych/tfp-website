"use client";

import { useState } from "react";

// Every toy is the same three parts: a fixed-height game stage, a fixed-height
// readout, controls pinned to the bottom. Nothing resizes while you play.

export function Toy({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 h-full">{children}</div>;
}

export function Stage({
  canvas,
  label,
  onDown,
  onMove,
  onUp,
  hint,
  hintTop = false,
}: {
  canvas: React.RefObject<HTMLCanvasElement | null>;
  label: string;
  onDown?: (e: React.PointerEvent) => void;
  onMove?: (e: React.PointerEvent) => void;
  onUp?: () => void;
  hint?: string;
  hintTop?: boolean;
}) {
  const [used, setUsed] = useState(false);
  return (
    <div className="font-display relative h-[300px] md:h-[400px] shrink-0 border-[3px] border-brutal-black overflow-hidden select-none">
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className={`font-mono block w-full h-full touch-pan-y ${onDown ? "cursor-pointer" : ""}`}
        onPointerDown={(e) => { setUsed(true); onDown?.(e); }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      />
      {hint && (
        <span className={`pointer-events-none absolute right-2 ${hintTop ? "top-2" : "bottom-2"} inline-flex items-center gap-2 border-[2px] border-brutal-black bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] shadow-[3px_3px_0_0_#000] transition-opacity duration-300 ${used ? "opacity-0" : ""}`}>
          <span className="relative inline-flex w-2.5 h-2.5" aria-hidden="true">
            <span className="absolute inset-0 bg-[#FF5CAA] motion-safe:animate-ping" />
            <span className="relative w-2.5 h-2.5 bg-[#FF5CAA] border border-brutal-black" />
          </span>
          {hint}
        </span>
      )}
    </div>
  );
}

export function Readout({ bad, children }: { bad: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`h-[76px] md:h-[84px] shrink-0 flex items-center border-[3px] border-brutal-black px-4 font-display font-black uppercase tracking-[-0.02em] text-lg md:text-2xl leading-tight transition-colors ${bad ? "bg-brutal-black text-[#FF5CAA]" : "bg-white text-brutal-black"}`}
      aria-live="polite"
    >
      <span className="line-clamp-2">{children}</span>
    </div>
  );
}

export function Controls({ children, fix }: { children: React.ReactNode; fix: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-col gap-3 pt-1">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {fix}
    </div>
  );
}

export function Btn({ onClick, children, tone = "black" }: { onClick: () => void; children: React.ReactNode; tone?: "black" | "white" }) {
  const base = "h-12 border-[3px] border-brutal-black px-5 font-mono text-xs font-bold uppercase tracking-[0.15em] whitespace-nowrap shadow-[3px_3px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow,background-color] duration-75";
  const color = tone === "black" ? "bg-brutal-black text-cream hover:bg-white hover:text-brutal-black" : "bg-white hover:bg-brutal-yellow";
  return <button onClick={onClick} className={`${base} ${color}`}>{children}</button>;
}

export function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`w-full h-12 flex items-center justify-between gap-3 border-[3px] border-brutal-black px-4 font-mono text-xs font-bold uppercase tracking-[0.15em] whitespace-nowrap shadow-[3px_3px_0_0_#000] transition-colors ${on ? "bg-brutal-black text-[#C6FF3D]" : "bg-white hover:bg-cream"}`}
    >
      <span>Fix: {label}</span>
      <span className="inline-flex items-center gap-2">
        <span className="opacity-70">{on ? "on" : "off"}</span>
        <span className={`relative inline-block w-10 h-5 border-[2.5px] ${on ? "border-[#C6FF3D]" : "border-brutal-black"}`} aria-hidden="true">
          <span className={`absolute top-[1px] w-3 h-3 transition-[left] duration-150 ${on ? "left-[19px] bg-[#C6FF3D]" : "left-[1px] bg-brutal-black"}`} />
        </span>
      </span>
    </button>
  );
}

export function Stepper({ value, onStep, unit }: { value: number; onStep: (d: number) => void; unit: string }) {
  return (
    <div className="h-12 inline-flex border-[3px] border-brutal-black bg-white shadow-[3px_3px_0_0_#000]">
      <button onClick={() => onStep(-1)} className="w-9 font-mono font-bold hover:bg-brutal-yellow" aria-label={`Fewer ${unit}`}>−</button>
      <span className="w-16 grid place-items-center border-x-[3px] border-brutal-black font-mono text-[11px] font-bold uppercase">{value} {unit}</span>
      <button onClick={() => onStep(1)} className="w-9 font-mono font-bold hover:bg-brutal-yellow" aria-label={`More ${unit}`}>+</button>
    </div>
  );
}

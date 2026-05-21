"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { siteConfig } from "@/lib/data";

type LineData = { type: "cmd" | "out"; text: string };

const SEQUENCE: LineData[] = [
  { type: "cmd", text: "$ whoami" },
  { type: "out", text: "→ Oleksii · CTO as a Service · 8 years · 30+ projects · linkedin.com/in/oleksii-kuropatkin1" },
  { type: "cmd", text: "$ cat ./skills" },
  { type: "out", text: "→ I turn ideas into working software — from zero to launch, fast." },
  { type: "cmd", text: "$ cat ./status" },
  { type: "out", text: `→ ${siteConfig.availability.terminal}` },
  { type: "cmd", text: "$ ./book-a-call.sh" },
  { type: "out", text: "→ opening calendar..." },
];

const CHAR_DELAY = 65;    // ms per character while typing
const POST_CMD   = 320;   // pause after command finishes before output appears
const POST_OUT   = 1100;  // pause after output before next command

export default function Terminal() {
  const anim = useRef({ seqIdx: 0, charIdx: 0, done: [] as LineData[] });

  const [display, setDisplay] = useState<{
    done: LineData[];
    partial: string;
  }>({ done: [], partial: "" });

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bodyRef = useRef<HTMLDivElement>(null);

  // We store tick in a ref so the function always reads the latest anim state
  const tick = useRef<() => void>(null!);

  tick.current = () => {
    const { seqIdx, charIdx, done } = anim.current;
    const item = SEQUENCE[seqIdx];

    if (!item) {
      // All lines done — stop, keep final state visible
      return;
    }

    if (item.type === "cmd") {
      const next = charIdx + 1;
      const partial = item.text.slice(0, next);

      if (next < item.text.length) {
        // Still typing
        anim.current.charIdx = next;
        setDisplay(d => ({ ...d, partial }));
        timer.current = setTimeout(() => tick.current(), CHAR_DELAY);
      } else {
        // Command fully typed — show cursor pause, then move on
        anim.current.charIdx = 0;
        setDisplay(d => ({ ...d, partial: item.text }));
        timer.current = setTimeout(() => {
          anim.current.seqIdx = seqIdx + 1;
          tick.current();
        }, POST_CMD);
      }
    } else {
      // Output line — push the preceding cmd + this output into done, clear partial
      const prevCmd = SEQUENCE[seqIdx - 1];
      const newDone = [...done, prevCmd, item];
      anim.current.done = newDone;
      anim.current.seqIdx = seqIdx + 1;
      anim.current.charIdx = 0;
      setDisplay({ done: newDone, partial: "" });
      timer.current = setTimeout(() => tick.current(), POST_OUT);
    }
  };

  // Auto-scroll body to bottom on every display update
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [display]);

  useEffect(() => {
    timer.current = setTimeout(() => tick.current(), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const openCalendly = () => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
    }
  };

  // Did the last output line ("opening calendar...") finish?
  const isLastLineShown = display.done.some(
    l => l.type === "out" && l.text.includes("opening calendar")
  );

  return (
    <div
      className="border-[3px] border-brutal-black bg-[#0a0a0a] font-mono text-sm rotate-1 overflow-hidden select-none"
      style={{ boxShadow: "8px 8px 0px 0px #000000" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-[2px] border-white/10 bg-[#111111]">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/30 flex-shrink-0" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/30 flex-shrink-0" />
        <span className="w-3 h-3 rounded-full bg-[#28C840] border border-black/30 flex-shrink-0" />
        <span className="ml-3 text-white/40 text-[11px] font-bold tracking-widest uppercase">
          oleksii@tfpdev ~
        </span>
      </div>

      {/* Terminal body — fixed height, scrolls as content grows */}
      <div ref={bodyRef} className="p-5 h-[290px] overflow-y-auto flex flex-col gap-1.5 text-[13px] leading-relaxed">
        {/* Completed lines */}
        {display.done.map((line, i) => (
          <div
            key={i}
            className={
              line.type === "cmd"
                ? "text-[#4ade80]"
                : "text-white/55 pl-0"
            }
          >
            {line.text}
          </div>
        ))}

        {/* Currently typing line (command only) + cursor */}
        {display.partial ? (
          <div className="text-[#4ade80]">
            {display.partial}
            <span className="cursor-blink text-[#4ade80]">▋</span>
          </div>
        ) : (
          /* Idle prompt between lines */
          <div className="text-[#4ade80]">
            <span className="text-white/25">$ </span>
            <span className="cursor-blink text-[#4ade80]">▋</span>
          </div>
        )}

        {/* Calendly call-to-action after last line */}
        {isLastLineShown && (
          <button
            onClick={openCalendly}
            className="mt-3 inline-flex items-center gap-2 border-[2px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-mono font-bold text-xs uppercase tracking-wide px-4 py-2 w-fit hover:bg-transparent hover:text-brutal-yellow transition-colors duration-150 cursor-pointer"
          >
            → open calendly
          </button>
        )}
      </div>
    </div>
  );
}

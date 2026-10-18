"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion } from "framer-motion";

// Three jagged bands that tile the plaque. Shared crack vertices overlap ~1% so
// the reassembled word shows no seam. On trigger each shard flies off a few px
// with a hard drop-shadow, holds, then snaps back — a cheap neo-brutalist crack.
const SHARDS = [
  { clip: "polygon(0 0, 100% 0, 100% 35%, 58% 45%, 28% 38%, 0 48%)", x: -15, y: -11, rot: -3 },
  { clip: "polygon(0 47%, 28% 37%, 58% 44%, 100% 34%, 100% 69%, 54% 61%, 24% 71%, 0 65%)", x: 17, y: -2, rot: 2.5 },
  { clip: "polygon(0 64%, 24% 70%, 54% 60%, 100% 68%, 100% 100%, 0 100%)", x: -12, y: 13, rot: -2.5 },
];
// The crack seam, in a 0–100 box, that stays faintly drawn on the bar afterwards.
const SEAMS = ["100,35 58,45 28,38 0,48"];

export default function ShatterMark({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const ref = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  const crack = async () => {
    if (reduce || busy.current) return;
    busy.current = true;
    await controls.start("broken");
    await new Promise((r) => setTimeout(r, 600));
    await controls.start("assembled");
    busy.current = false;
  };

  useEffect(() => {
    if (inView) crack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <span ref={ref} className={`relative inline-block ${className}`} onMouseEnter={crack}>
      {/* sizer: holds the line's space so nothing reflows when the shards move */}
      <span className="invisible bg-brutal-yellow px-[0.08em]">{children}</span>
      {SHARDS.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          custom={s}
          animate={controls}
          initial={reduce ? "rested" : "assembled"}
          variants={{
            assembled: { x: 0, y: 0, rotate: 0, filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0))" },
            // reduced-motion end state: a small, static offset so the crack reads
            rested: (c: { x: number; y: number }) => ({ x: Math.sign(c.x) * 2, y: Math.sign(c.y) * 2, rotate: 0, filter: "drop-shadow(2px 2px 0px #000)" }),
            broken: (c: { x: number; y: number; rot: number }) => ({
              x: c.x,
              y: c.y,
              rotate: c.rot,
              filter: "drop-shadow(6px 7px 0px #000)",
              transition: { duration: 0.16, ease: "easeOut" },
            }),
          }}
          transition={{ type: "spring", stiffness: 460, damping: 17 }}
          className="absolute inset-0 bg-brutal-yellow px-[0.08em] text-brutal-black"
          style={{ clipPath: s.clip, WebkitClipPath: s.clip }}
        >
          {children}
        </motion.span>
      ))}
      {/* the crack line that stays visible on the bar */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {SEAMS.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke="#0A0A0A" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </span>
  );
}

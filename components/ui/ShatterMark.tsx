"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion } from "framer-motion";

// Three chunks that tile the plaque. One jagged near-vertical crack splits it
// into a left slab and a right half; a second crack splits the right half top
// from bottom. The chunks share edge vertices exactly, so the reassembled word
// shows no seam. On trigger they fly apart with a hard drop-shadow, hold, then
// snap back — a deliberate neo-brutalist break.
const SHARDS = [
  // left slab — flies left
  { clip: "polygon(0 0, 48% 0, 52% 30%, 46% 55%, 50% 80%, 47% 100%, 0 100%)", x: -24, y: -5, rot: -2 },
  // right-top chunk — flies up and right
  { clip: "polygon(48% 0, 100% 0, 100% 46%, 85% 58%, 70% 50%, 46% 55%, 52% 30%)", x: 24, y: -13, rot: 2 },
  // right-bottom chunk — flies down and right
  { clip: "polygon(46% 55%, 70% 50%, 85% 58%, 100% 46%, 100% 100%, 47% 100%, 50% 80%)", x: 16, y: 15, rot: 3 },
];
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
    await new Promise((r) => setTimeout(r, 650));
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
              filter: "drop-shadow(6px 6px 0px #000)",
              transition: { duration: 0.14, ease: [0.2, 0.9, 0.3, 1] },
            }),
          }}
          transition={{ type: "spring", stiffness: 520, damping: 26, mass: 0.8 }}
          className="absolute inset-0 bg-brutal-yellow px-[0.08em] text-brutal-black"
          style={{ clipPath: s.clip, WebkitClipPath: s.clip }}
        >
          {children}
        </motion.span>
      ))}
    </span>
  );
}

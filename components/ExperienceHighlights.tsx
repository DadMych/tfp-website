"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { experienceHighlights } from "@/lib/data";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function ExperienceHighlights() {
  return (
    <section
      id="experience"
      className="py-16 md:py-20 border-b-[3px] border-white/10"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mb-10 flex flex-col gap-3"
        >
          <span className="inline-block border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            What actually matters
          </span>
          <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl leading-[0.95] text-cream uppercase tracking-[-0.03em] max-w-3xl">
            Four patterns.
            <br />
            <span className="text-brutal-yellow">Thirty projects.</span>
          </h2>
          <p className="font-display text-base text-white/45 max-w-xl leading-relaxed">
            Everything else proves range. This is what clients hire me for.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {experienceHighlights.map((item, i) => (
            <motion.div
              key={item.rank}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              whileHover={{ x: 3, y: 3, transition: { duration: 0.1 } }}
              className="relative border-[3px] border-white/10 bg-[#111111] p-6 md:p-8 overflow-hidden"
              style={{
                borderLeftColor: item.accentHex,
                borderLeftWidth: "5px",
                boxShadow: `5px 5px 0px 0px ${item.accentHex}40`,
              }}
            >
              <span
                className="absolute top-2 right-4 font-display font-black text-[5rem] md:text-[6rem] leading-none select-none pointer-events-none italic"
                style={{ color: item.accentHex, opacity: 0.12 }}
                aria-hidden="true"
              >
                {item.rank}
              </span>

              <div className="relative z-10 flex flex-col gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  {item.rank} · {item.label}
                </span>
                <p
                  className="font-display font-black text-4xl sm:text-5xl md:text-6xl uppercase tracking-[-0.03em] leading-none"
                  style={{ color: item.accentHex }}
                >
                  {item.stat}
                </p>
                <p className="font-display text-sm text-white/55 leading-relaxed max-w-md">
                  {item.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

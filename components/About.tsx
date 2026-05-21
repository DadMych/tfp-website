"use client";

import { motion } from "framer-motion";
import { stats, timeline, clientQuote, siteConfig } from "@/lib/data";

export default function About() {
  return (
    <section
      id="about"
      className="bg-cream border-b-[3px] border-brutal-black py-20 md:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-16">

        {/* Top: bio + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — bio */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-3">
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
                About
              </span>
              <h2 className="font-display font-black text-5xl md:text-6xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
                The short<br />version.
              </h2>
            </div>

            <div className="flex flex-col gap-4 font-display text-base sm:text-lg text-brutal-black/75 leading-relaxed">
              <p>
                {clientQuote.context} He said: &ldquo;{clientQuote.text}&rdquo;
              </p>
              <p>
                That changed how I think about this craft. The startup world is
                full of brilliant engineers who disappear mid-project.
                Founders aren&apos;t actually shopping for the smartest CTO
                — they&apos;re shopping for the one who&apos;ll still be there
                in six months, answering messages and shipping on schedule.
              </p>
              <p>
                I&apos;m not the most brilliant engineer you can hire.
                I&apos;m the one who&apos;ll still be here Monday morning.
                BSc in Computer Science from Kyiv Polytechnic. Based in
                Europe, covering EU and US East Coast timezones.
              </p>
              <p className="font-black text-brutal-black uppercase tracking-tight">
                I take on 2–3 clients at a time.
                <br />Every engagement gets deep focus.
              </p>
            </div>

            {/* Stickers */}
            <div className="flex flex-wrap gap-3">
              <a
                href={siteConfig.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-[3px] border-brutal-black bg-white px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide rotate-2 hover:bg-brutal-yellow transition-colors duration-150"
              >
                LinkedIn →
              </a>
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide -rotate-1">
                8 YEARS. STILL SHIPPING.
              </span>
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-blue px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide rotate-1">
                Based in Europe
              </span>
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-coral px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide -rotate-1">
                Your reputation is my reputation.
              </span>
            </div>
          </motion.div>

          {/* Right — stats grid */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                  className={`p-7 border-[3px] border-brutal-black flex flex-col gap-2 ${stat.rotate}`}
                  style={{
                    backgroundColor: stat.accentHex,
                    boxShadow: "5px 5px 0px 0px #000000",
                  }}
                >
                  <div className="font-display font-black text-5xl sm:text-6xl text-brutal-black leading-none">
                    {stat.value}
                  </div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-brutal-black/60">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pull quote */}
            <div className="border-[3px] border-brutal-black bg-brutal-black p-6 relative overflow-hidden">
              <div
                className="absolute -top-4 -left-2 font-display font-black text-[8rem] leading-none text-brutal-yellow select-none pointer-events-none"
                style={{ opacity: 0.15 }}
                aria-hidden="true"
              >
                &ldquo;
              </div>
              <p className="relative z-10 font-display font-bold text-base sm:text-lg text-cream leading-relaxed">
                &ldquo;When you say it&apos;ll be done Friday — it&apos;s done
                Friday. You don&apos;t disappear. You just do the work.&rdquo;
                <br />
                <span className="text-brutal-yellow font-black">
                  — Longest-running client, on why he keeps paying me
                </span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Timeline strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/40 mb-5">
            Timeline
          </p>
          <div className="flex flex-col sm:flex-row border-[3px] border-brutal-black overflow-x-auto">
            {timeline.map((item, i) => (
              <div
                key={item.year}
                className={`flex-1 min-w-[140px] p-5 flex flex-col gap-2 ${
                  i < timeline.length - 1
                    ? "border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-brutal-black"
                    : ""
                } ${i === timeline.length - 1 ? "bg-brutal-yellow" : "bg-white"}`}
              >
                <span className="font-mono text-sm font-black text-brutal-black uppercase tracking-widest">
                  {item.year}
                </span>
                <span className="font-display text-sm text-brutal-black/70 leading-snug">
                  {item.event}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}

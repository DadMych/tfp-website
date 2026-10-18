"use client";

import { motion } from "framer-motion";
import { steps, siteConfig } from "@/lib/data";
import DualCTA from "@/components/ui/DualCTA";

export default function HowItWorks() {

  return (
    <section
      id="process"
      className="bg-cream border-b-[3px] border-brutal-black py-20 md:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            How It Works
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
            Three steps.
            <br />
            That&apos;s it.
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-[3px] border-brutal-black mb-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.12, duration: 0.45, ease: "easeOut" }}
              className={`relative bg-white flex flex-col gap-4 p-8 sm:p-10 overflow-hidden ${
                i < steps.length - 1
                  ? "border-b-[3px] md:border-b-0 md:border-r-[3px] border-brutal-black"
                  : ""
              }`}
            >
              {/* Huge background number — absolute, low opacity */}
              <div
                className="absolute -bottom-4 -right-2 font-display font-black leading-none select-none pointer-events-none"
                style={{
                  fontSize: "clamp(8rem, 16vw, 14rem)",
                  color: step.accentHex,
                  opacity: 0.12,
                  lineHeight: 1,
                }}
              >
                {step.number}
              </div>

              {/* Step number badge */}
              <div
                className="relative z-10 inline-flex w-fit border-[3px] border-brutal-black px-3 py-1 font-mono font-black text-2xl leading-none shadow-brutal-sm"
                style={{ backgroundColor: step.accentHex }}
              >
                {step.number}
              </div>

              {/* Title */}
              <h3
                className="relative z-10 font-display font-black text-2xl sm:text-3xl text-brutal-black leading-tight uppercase tracking-tight"
                style={{ whiteSpace: "pre-line" }}
              >
                {step.title}
              </h3>

              {/* Description */}
              <p className="relative z-10 font-display text-base text-brutal-black/70 leading-relaxed">
                {step.description}
              </p>

              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 bg-brutal-black text-cream font-black text-lg w-9 h-9 items-center justify-center border-[3px] border-brutal-black">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA after steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <DualCTA
            onBookCall={() => {
              if (typeof window !== "undefined" && (window as any).Calendly) {
                (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
              }
            }}
              quizText="want to think it through first? start a project"
            layout="horizontal"
          />
        </motion.div>
      </div>
    </section>
  );
}

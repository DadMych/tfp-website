"use client";

import { steps, siteConfig } from "@/lib/data";
import DualCTA from "@/components/ui/DualCTA";

export default function HowItWorks() {
  return (
    <section id="process" className="bg-brutal-yellow border-b-[3px] border-brutal-black py-20 md:py-28 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-black text-cream px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            How It Works
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
            Three steps.
            <br />
            That&apos;s it.
          </h2>
        </div>

        {/* Steps on one line, number stamps as nodes */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-y-10 md:gap-y-0 mb-12">
          {/* the line / cable */}
          <span aria-hidden="true" className="md:hidden absolute left-6 top-6 bottom-6 w-[4px] -translate-x-1/2 bg-brutal-black" />
          <span aria-hidden="true" className="hidden md:block absolute top-[22px] left-0 right-0 h-[4px] bg-brutal-black" />

          {steps.map((step, i) => (
            <div key={step.number} className="group relative flex md:flex-col gap-4 md:gap-5 md:pr-10">
              {/* cable gap at this step's left edge — closes on hover, connected under reduced motion */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute left-0 top-[18px] h-[10px] w-8 -translate-x-1/2 bg-brutal-yellow transition-opacity duration-150 group-hover:opacity-0 motion-reduce:hidden"
                />
              )}

              {/* number stamp */}
              <span className="relative z-10 flex-shrink-0 inline-flex h-12 w-12 items-center justify-center border-[3px] border-brutal-black bg-cream font-mono font-black text-2xl leading-none text-brutal-black shadow-[3px_3px_0_0_#000]">
                {step.number}
              </span>

              <div className="flex flex-col gap-2">
                <h3 className="font-display font-black text-2xl sm:text-3xl text-brutal-black leading-tight uppercase tracking-tight" style={{ whiteSpace: "pre-line" }}>
                  {step.title}
                </h3>
                <p className="font-display text-base text-brutal-black/70 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA after steps */}
        <DualCTA
          onBookCall={() => {
            if (typeof window !== "undefined" && (window as { Calendly?: { initPopupWidget: (o: { url: string }) => void } }).Calendly) {
              (window as unknown as { Calendly: { initPopupWidget: (o: { url: string }) => void } }).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
            }
          }}
          quizText="want to think it through first? start a project"
          layout="horizontal"
        />
      </div>
    </section>
  );
}

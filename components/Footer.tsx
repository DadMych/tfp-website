"use client";

import { motion } from "framer-motion";
import { siteConfig } from "@/lib/data";
import DualCTA from "@/components/ui/DualCTA";

export default function Footer() {
  const openCalendly = () => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
    }
  };

  return (
    <footer id="contact" className="bg-brutal-black">

      {/* Main CTA block */}
      <div className="relative overflow-hidden border-b-[3px] border-white/10 py-20 md:py-28">

        {/* "AVAILABLE" watermark — large rotated background text */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          aria-hidden="true"
        >
          <span
            className="font-display font-black text-cream uppercase tracking-widest"
            style={{
              fontSize: "clamp(4rem, 12vw, 10rem)",
              opacity: 0.04,
              transform: "rotate(-15deg)",
              letterSpacing: "0.3em",
            }}
          >
            AVAILABLE
          </span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start gap-8"
          >
            {/* Label with availability sticker */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-block border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                Let&apos;s work together
              </span>
              <span className="inline-block border-[3px] border-brutal-red bg-brutal-red text-cream px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest shadow-brutal-sm rotate-1">
                {siteConfig.availability.footerBadge}
              </span>
            </div>

            {/* Headline */}
            <h2 className="font-display font-black uppercase tracking-[-0.04em] text-cream leading-[0.9] max-w-5xl"
              style={{ fontSize: "clamp(2.8rem, 7vw, 7.5rem)" }}
            >
              You made it
              <br />
              to the bottom.
              <br />
              <span className="text-brutal-yellow">That means you&apos;re serious.</span>
            </h2>

            {/* Subheadline */}
            <p className="font-display text-lg sm:text-xl text-cream/50 max-w-lg leading-relaxed">
              {siteConfig.availability.footerLine}
            </p>

            {/* Primary CTA */}
            <DualCTA
              onBookCall={openCalendly}
              quizText="or start with a free quiz"
              layout="stacked"
              variant="dark"
            />

            {/* Email + LinkedIn */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Or reach out directly:
                </span>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="font-mono font-black text-2xl sm:text-3xl md:text-4xl text-cream hover:text-brutal-yellow transition-colors duration-150 tracking-tight"
                >
                  {siteConfig.email}
                </a>
              </div>
              <a
                href={siteConfig.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-widest text-cream/50 hover:text-brutal-yellow transition-colors duration-150 w-fit"
              >
                LinkedIn →
              </a>
            </div>

          </motion.div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="py-5 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="font-mono text-sm font-black text-brutal-yellow uppercase tracking-widest">
            tfpdev
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href={siteConfig.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs font-bold uppercase tracking-widest text-cream/40 hover:text-brutal-yellow transition-colors duration-150"
            >
              LinkedIn
            </a>
            <span className="font-mono text-xs text-cream/25">
              © 2026 · Based in Europe · EU &amp; US East Coast timezones · English · Ukrainian · Russian
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

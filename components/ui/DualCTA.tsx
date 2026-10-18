"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

interface DualCTAProps {
  onBookCall: () => void;
  quizText?: string;
  bookCallLabel?: string;
  /** horizontal = side-by-side on desktop (stacks on mobile automatically) */
  layout?: "horizontal" | "stacked";
  /** light = cream/white backgrounds · dark = black backgrounds */
  variant?: "light" | "dark";
}

export default function DualCTA({
  onBookCall,
  quizText = "not sure yet? tell me about your project",
  bookCallLabel = "Book a Free Call →",
  layout = "horizontal",
  variant = "light",
}: DualCTAProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={`flex flex-col gap-3 ${
        layout === "horizontal" ? "md:flex-row md:items-center md:gap-6" : ""
      }`}
    >
      {/* Primary CTA */}
      <button
        onClick={onBookCall}
        className={`btn-pulse inline-flex items-center justify-center border-[3px] bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-wide px-8 py-4 text-base hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all duration-150 cursor-pointer ${
          isDark
            ? "border-brutal-yellow"
            : "border-brutal-black shadow-brutal"
        }`}
      >
        {bookCallLabel}
      </button>

      {/* Companion: quiz */}
      <Link
        href="/start"
        className={`group inline-flex items-center gap-2 font-mono text-sm transition-colors ${
          isDark
            ? "text-white/40 hover:text-white/70"
            : "text-black/40 hover:text-black/70"
        }`}
      >
        <RotateCcw
          size={14}
          strokeWidth={2}
          className="transition-transform duration-300 group-hover:-rotate-45 flex-shrink-0"
        />
        <span
          className={`underline underline-offset-4 ${
            isDark
              ? "decoration-white/20 group-hover:decoration-white/50"
              : "decoration-black/20 group-hover:decoration-black/50"
          }`}
        >
          {quizText}
        </span>
      </Link>
    </div>
  );
}

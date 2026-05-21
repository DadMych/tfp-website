"use client";

import { motion } from "framer-motion";
import { clientQuote } from "@/lib/data";

export default function ClientTestimonial() {
  return (
    <section className="bg-cream border-y-[3px] border-brutal-black py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
          className="border-[3px] border-brutal-black bg-white p-8 md:p-10 relative"
          style={{ boxShadow: "8px 8px 0px 0px #000000" }}
        >
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-6">
            What clients say
          </span>

          <blockquote className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-brutal-black leading-snug tracking-tight mb-6">
            &ldquo;{clientQuote.text}&rdquo;
          </blockquote>

          <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-brutal-black/45">
            — {clientQuote.attribution}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

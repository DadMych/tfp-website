"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  insights,
  categories,
  featuredInsightIds,
} from "@/lib/insights-data";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const featuredInsights = featuredInsightIds
  .map((id) => insights.find((insight) => insight.id === id))
  .filter((insight): insight is NonNullable<typeof insight> => !!insight);

function categoryLabel(key: string) {
  return categories.find((c) => c.key === key)?.label ?? key.toUpperCase();
}

function categoryColor(key: string) {
  return categories.find((c) => c.key === key)?.color ?? "#FFE600";
}

export default function InsightsPreview() {
  return (
    <section
      id="insights"
      className="bg-cream border-y-[3px] border-brutal-black py-20 md:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            Insights
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
            I think
            <br />
            <span className="text-brutal-black/45">out loud.</span>
          </h2>
          <p className="font-display text-base sm:text-lg text-brutal-black/60 max-w-2xl leading-relaxed">
            Selected pieces from things I&apos;ve shipped — what worked, what
            almost broke, and what I&apos;d do differently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {featuredInsights.map((insight, i) => (
            <motion.div
              key={insight.id}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              whileHover={{ x: 3, y: 3, transition: { duration: 0.1 } }}
              className="bg-white border-[3px] border-brutal-black flex flex-col"
              style={{ boxShadow: "6px 6px 0px 0px #000000" }}
            >
              <div
                className="h-[5px] border-b-[3px] border-brutal-black"
                style={{ backgroundColor: categoryColor(insight.category) }}
              />
              <div className="p-6 flex flex-col gap-4 flex-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-brutal-black/40">
                  {categoryLabel(insight.category)}
                </span>
                <h3 className="font-display font-black text-xl uppercase leading-tight text-brutal-black tracking-tight">
                  {insight.title}
                </h3>
                <p className="font-display text-sm text-brutal-black/65 leading-relaxed flex-1">
                  &ldquo;{insight.highlight}&rdquo;
                </p>
                <Link
                  href={`/insights#insight-${insight.id}`}
                  className="font-mono text-xs font-bold uppercase tracking-widest text-brutal-black hover:text-brutal-yellow transition-colors duration-150 w-fit"
                >
                  Read insight →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <Link
          href="/insights"
          className="inline-flex items-center justify-center border-[3px] border-brutal-black bg-brutal-black text-cream font-display font-black uppercase tracking-wide px-8 py-4 text-base shadow-brutal hover:shadow-brutal-hover hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150"
        >
          Read all 24 insights →
        </Link>
      </div>
    </section>
  );
}

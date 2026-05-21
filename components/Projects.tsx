"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { MapPin } from "lucide-react";
import { projects, type Project } from "@/lib/data";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

const flagshipProjects = projects.filter((p) => p.tier !== "more");
const moreProjects = projects.filter((p) => p.tier === "more");

function ProjectCard({
  project,
  index,
  compact = false,
}: {
  project: Project;
  index: number;
  compact?: boolean;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      whileHover={{ x: 3, y: 3, transition: { duration: 0.1 } }}
      className="relative border-[3px] border-white/10 flex flex-col"
      style={{
        backgroundColor: "#111111",
        boxShadow: `4px 4px 0px 0px ${project.accentHex}50`,
        borderLeftColor: project.accentHex,
        borderLeftWidth: "5px",
      }}
    >
      <div className={`p-6 flex flex-col gap-4 ${project.featured && !compact ? "md:p-8" : ""}`}>
        {project.underNda && (
          <div
            className="absolute -top-3 right-4 z-20 bg-brutal-red border-[3px] border-brutal-red text-cream font-mono font-black text-[11px] uppercase tracking-[0.15em] px-3 py-1"
            style={{
              transform: "rotate(-5deg)",
              boxShadow: "3px 3px 0px 0px #000000",
            }}
          >
            Under NDA
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white/40 uppercase tracking-widest">
            <MapPin size={11} strokeWidth={2.5} />
            {project.location}
          </span>
        </div>

        <h3
          className={`font-display font-black text-white uppercase tracking-tight leading-tight ${
            project.featured && !compact
              ? "text-2xl sm:text-3xl md:text-4xl"
              : compact
              ? "text-lg sm:text-xl"
              : "text-xl sm:text-2xl"
          }`}
        >
          {project.title}
        </h3>

        {!compact && (
          <p className="font-display text-sm text-white/60 leading-relaxed">
            {project.description}
          </p>
        )}

        <div
          className="border-l-[3px] pl-3 py-1"
          style={{ borderColor: project.accentHex }}
        >
          <p
            className={`font-mono font-bold uppercase tracking-wide ${
              compact ? "text-[10px]" : "text-xs"
            }`}
            style={{ color: project.accentHex }}
          >
            {project.metrics}
          </p>
        </div>

        {!compact && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="inline-block border-[2px] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    borderColor: project.accentHex + "60",
                    color: project.accentHex,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {project.insightLink && project.insightText && (
              <Link
                href={project.insightLink}
                className="block font-mono text-xs text-brutal-yellow hover:text-white underline underline-offset-4 transition-colors duration-150"
              >
                {project.insightText} →
              </Link>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function Projects() {
  return (
    <section
      id="projects"
      className="py-20 md:py-28"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-white/20 bg-transparent text-cream px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            The proof
          </span>
          <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl leading-[0.95] text-cream uppercase tracking-[-0.03em]">
            Same patterns.
            <br />
            <span className="text-white/40">Real projects.</span>
          </h2>
          <Link
            href="/insights"
            className="font-mono text-sm font-bold text-brutal-yellow underline underline-offset-4 hover:no-underline transition-all duration-150 w-fit"
          >
            24 insights from building them →
          </Link>
        </div>

        {/* Flagship cases */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          {flagshipProjects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>

        {/* Also shipped — compact */}
        <div className="border-t-[3px] border-white/10 pt-12">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                Also shipped
              </span>
              <p className="font-display font-bold text-xl text-white/50 mt-1">
                Range matters. These aren&apos;t the headline — but they&apos;re real.
              </p>
            </div>
            <span className="font-mono text-xs text-white/25 uppercase tracking-widest">
              + more under NDA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {moreProjects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                compact
              />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left"
        >
          <p className="font-display font-bold text-white/40 text-base">
            <span className="text-brutal-yellow font-black">
              Let&apos;s talk about what I can build for you.
            </span>
          </p>
          <span className="hidden sm:inline text-white/20">·</span>
          <Link
            href="/insights"
            className="font-mono text-sm font-bold text-brutal-yellow underline underline-offset-4 hover:no-underline transition-all duration-150 whitespace-nowrap"
          >
            Read 24 insights →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

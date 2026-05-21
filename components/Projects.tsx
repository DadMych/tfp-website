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

const locations = ["US", "Turkey", "Cyprus", "Ukraine", "Germany", "UAE"];

const flagshipProjects = projects.filter((p) => p.tier !== "more");
const moreProjects = projects.filter((p) => p.tier === "more");

const heroProject = flagshipProjects[0];
const trioProjects = flagshipProjects.slice(1);

function NdaStamp() {
  return (
    <div
      className="absolute top-4 right-4 z-30 bg-brutal-red border-[2px] border-brutal-red text-cream font-mono font-black text-[10px] uppercase tracking-[0.15em] px-2 py-0.5"
      style={{
        transform: "rotate(-3deg)",
        boxShadow: "2px 2px 0px 0px #000000",
      }}
    >
      Under NDA
    </div>
  );
}

function GhostNumber({
  rank,
  accentHex,
  size = "8rem",
  position = "top-2 right-4",
}: {
  rank: string;
  accentHex: string;
  size?: string;
  position?: string;
}) {
  return (
    <span
      className={`absolute ${position} font-display font-black italic leading-none select-none pointer-events-none`}
      style={{
        fontSize: size,
        color: accentHex,
        opacity: 0.1,
      }}
      aria-hidden="true"
    >
      {rank}
    </span>
  );
}

function FlagshipHero({ project }: { project: Project }) {
  const metricsList = project.metrics
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  const primary = metricsList[0];
  const rest = metricsList.slice(1);

  return (
    <motion.div
      custom={0}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      whileHover={{ x: 3, y: 3, transition: { duration: 0.1 } }}
      className="relative border-[3px] border-white/10 bg-[#111111] grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] mb-5"
      style={{
        boxShadow: `5px 5px 0px 0px ${project.accentHex}50`,
        borderLeftColor: project.accentHex,
        borderLeftWidth: "6px",
      }}
    >
      {project.underNda && <NdaStamp />}

      {/* ── Left: narrative ─────────────────────────── */}
      <div className="p-7 md:p-10 flex flex-col gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white/40 uppercase tracking-widest">
            <MapPin size={11} strokeWidth={2.5} />
            {project.location}
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-yellow">
            · Flagship
          </span>
        </div>

        <h3 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white uppercase tracking-[-0.02em] leading-[0.95]">
          {project.title}
        </h3>

        <p className="font-display text-base md:text-lg text-white/65 leading-relaxed max-w-2xl">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-auto">
          {project.tags.slice(0, 5).map((tag) => (
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
            className="font-mono text-xs text-brutal-yellow hover:text-white underline underline-offset-4 transition-colors duration-150 w-fit"
          >
            {project.insightText} →
          </Link>
        )}
      </div>

      {/* ── Right: metrics panel ────────────────────── */}
      <div
        className="relative border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-white/10 p-7 md:p-10 flex flex-col gap-5 overflow-hidden"
        style={{ backgroundColor: "#0d0d0d" }}
      >
        <GhostNumber
          rank="01"
          accentHex={project.accentHex}
          size="14rem"
          position="-top-6 -right-2"
        />

        <div className="relative z-10 flex flex-col gap-5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
            By the numbers
          </span>

          {primary && (
            <div
              className="border-l-[4px] pl-4 py-1"
              style={{ borderColor: project.accentHex }}
            >
              <p
                className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight leading-tight"
                style={{ color: project.accentHex }}
              >
                {primary}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {rest.map((metric) => (
              <div
                key={metric}
                className="border-l-[2px] pl-3 py-0.5"
                style={{ borderColor: project.accentHex + "60" }}
              >
                <p
                  className="font-mono text-xs font-bold uppercase tracking-wide leading-snug"
                  style={{ color: project.accentHex, opacity: 0.85 }}
                >
                  {metric}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FlagshipCard({ project, index }: { project: Project; index: number }) {
  const rank = String(index + 2).padStart(2, "0");

  return (
    <motion.div
      custom={index + 1}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      whileHover={{ x: 3, y: 3, transition: { duration: 0.1 } }}
      className="relative border-[3px] border-white/10 flex flex-col overflow-hidden"
      style={{
        backgroundColor: "#111111",
        boxShadow: `4px 4px 0px 0px ${project.accentHex}50`,
        borderLeftColor: project.accentHex,
        borderLeftWidth: "5px",
      }}
    >
      {project.underNda && <NdaStamp />}

      <GhostNumber rank={rank} accentHex={project.accentHex} size="7rem" />

      <div className="relative z-10 p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white/40 uppercase tracking-widest">
            <MapPin size={11} strokeWidth={2.5} />
            {project.location}
          </span>
        </div>

        <h3 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-tight leading-tight">
          {project.title}
        </h3>

        <p className="font-display text-sm text-white/60 leading-relaxed">
          {project.description}
        </p>

        <div
          className="border-l-[3px] pl-3 py-1 mt-auto"
          style={{ borderColor: project.accentHex }}
        >
          <p
            className="font-mono text-xs font-bold uppercase tracking-wide leading-snug"
            style={{ color: project.accentHex }}
          >
            {project.metrics}
          </p>
        </div>

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
      </div>
    </motion.div>
  );
}

function CompactCard({ project, index }: { project: Project; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      whileHover={{ x: 2, y: 2, transition: { duration: 0.1 } }}
      className="relative border-[3px] border-white/10 bg-[#111111] p-5 flex flex-col gap-3"
      style={{
        borderLeftColor: project.accentHex,
        borderLeftWidth: "4px",
      }}
    >
      <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-white/35 uppercase tracking-widest">
        <MapPin size={10} strokeWidth={2.5} />
        {project.location}
      </span>
      <h3 className="font-display font-black text-base sm:text-lg text-white uppercase tracking-tight leading-snug">
        {project.title}
      </h3>
      <p
        className="font-mono text-[10px] font-bold uppercase tracking-wide leading-relaxed"
        style={{ color: project.accentHex }}
      >
        {project.metrics}
      </p>
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

        {/* ── Section header ─────────────────────────── */}
        <div className="mb-8 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            Selected Work
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-cream uppercase tracking-[-0.03em]">
            30+ shipped.
            <br />
            <span className="text-brutal-yellow">Here are some.</span>
          </h2>
        </div>

        {/* ── Geography row ──────────────────────────── */}
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-white/30 mr-1">
            Clients from:
          </span>
          {locations.map((loc, i) => (
            <span key={loc} className="flex items-center gap-1">
              <span className="border-[2px] border-white/20 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wide text-white/60">
                {loc}
              </span>
              {i < locations.length - 1 && (
                <span className="text-white/20 font-bold ml-1">·</span>
              )}
            </span>
          ))}
        </div>

        {/* ── Flagship hero ──────────────────────────── */}
        {heroProject && <FlagshipHero project={heroProject} />}

        {/* ── Trio of supporting flagship cases ──────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {trioProjects.map((project, i) => (
            <FlagshipCard key={project.id} project={project} index={i} />
          ))}
        </div>

        {/* ── Also shipped — compact strip ───────────── */}
        {moreProjects.length > 0 && (
          <div className="mt-14">
            <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
                Also shipped
              </span>
              <span className="font-mono text-[10px] text-white/25 uppercase tracking-widest">
                + more under NDA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {moreProjects.map((project, i) => (
                <CompactCard key={project.id} project={project} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── Footer line ────────────────────────────── */}
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
            Read 24 insights from these projects →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

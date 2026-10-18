"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Rocket, Zap, Bot, CreditCard, Building2, Server, HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { services, wildCard, siteConfig, type Service } from "@/lib/data";
import DualCTA from "@/components/ui/DualCTA";

const ICONS: Record<string, LucideIcon> = {
  Rocket, Zap, Bot, CreditCard, Building2, Server, HelpCircle,
};

// Splits "Main text (parenthetical note)" into styled parts
function DeliverableText({ text }: { text: string }) {
  const idx = text.indexOf("(");
  if (idx <= 0) return <>{text}</>;
  const main = text.slice(0, idx).trimEnd();
  const note = text.slice(idx);
  return (
    <>
      {main}{" "}
      <span className="text-black/35 italic text-xs font-normal">{note}</span>
    </>
  );
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" as const },
  }),
};

// ── Premium CTO Card ─────────────────────────────────────────────────────────

function CTOCard() {
  const cto = services.find(s => s.id === "cto")!;

  const openCalendly = () => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
    }
  };

  return (
    <motion.div
      custom={0}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      whileHover={{
        x: 3, y: 3,
        boxShadow: "3px 3px 0px 0px #000000",
        transition: { duration: 0.1 },
      }}
      className="md:col-span-2 bg-white border-[3px] border-brutal-black flex flex-col overflow-hidden"
      style={{ boxShadow: "6px 6px 0px 0px #000000" }}
    >
      {/* Yellow top border — thicker than standard cards */}
      <div className="h-[7px] bg-brutal-yellow border-b-[3px] border-brutal-black flex-shrink-0" />

      <div className="p-6 sm:p-8 flex flex-col gap-8">

        {/* ── Main two-column section ── */}
        <div className="grid grid-cols-1 md:grid-cols-[55%_45%] gap-8">

          {/* Left: icon, title, badge, bestFor, description */}
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 border-[3px] border-brutal-black bg-brutal-yellow">
                <Rocket size={32} strokeWidth={2.5} className="text-brutal-black" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-[-0.02em] text-brutal-black leading-tight">
                  CTO as a Service
                </h3>
                <span className="inline-block border-[3px] border-brutal-red bg-brutal-red text-cream px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest -rotate-1 w-fit">
                  Start Here
                </span>
              </div>
            </div>

            <p className="font-mono text-xs font-bold uppercase tracking-widest text-brutal-black/50">
              Best for:{" "}
              <span className="normal-case tracking-normal font-display font-semibold text-brutal-black/70">
                {cto.bestFor}
              </span>
            </p>

            <p className="font-display text-base text-brutal-black/75 leading-relaxed">
              {cto.description}
            </p>
          </div>

          {/* Right: deliverables */}
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/40">
              What you get
            </p>
            <div className="border-t-[2px] border-dashed border-brutal-black/20" />
            <ul className="flex flex-col gap-2.5">
              {cto.deliverables.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-display text-brutal-black">
                  <span className="inline-block w-3.5 h-3.5 flex-shrink-0 mt-0.5 border-[2px] border-brutal-black bg-brutal-yellow" />
                  <DeliverableText text={item} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Pricing + CTA ── */}
        <div className="border-t-[2px] border-dashed border-brutal-black/20 pt-4 flex flex-col gap-4">
          {/* Consulting footnote */}
          <p className="text-sm text-brutal-black/40 italic">
            Don&apos;t need a full retainer? I also do one-off consulting — architecture
            reviews, technical audits, hiring help. Sometimes one conversation saves months
            of wrong turns.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {/* Pricing badge */}
            <div className="border-[2px] border-brutal-black bg-brutal-black px-4 py-2 w-fit">
              <span className="font-mono text-xs font-bold text-brutal-yellow uppercase tracking-widest">
                {cto.pricing}
              </span>
            </div>
            <DualCTA
              onBookCall={openCalendly}
              bookCallLabel="Book a Free Intro Call →"
              quizText="not sure if you need a CTO? free quiz"
              layout="horizontal"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Regular service card ──────────────────────────────────────────────────────

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const Icon = ICONS[service.iconName] ?? Rocket;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      whileHover={{
        x: 3, y: 3,
        boxShadow: "3px 3px 0px 0px #000000",
        transition: { duration: 0.1 },
      }}
      className="bg-white border-[3px] border-brutal-black flex flex-col overflow-hidden cursor-default"
      style={{ boxShadow: "6px 6px 0px 0px #000000" }}
    >
      {/* Accent strip */}
      <div
        className="h-[6px] border-b-[3px] border-brutal-black flex-shrink-0"
        style={{ backgroundColor: service.accentHex }}
      />

      <div className="p-6 flex flex-col flex-1 gap-5">
        {/* Icon + title */}
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 p-2 border-[3px] border-brutal-black"
            style={{ backgroundColor: service.accentHex }}
          >
            <Icon size={32} strokeWidth={2.5} className="text-brutal-black" />
          </div>
          <h3 className="font-display font-black text-xl sm:text-2xl leading-tight text-brutal-black uppercase tracking-tight">
            {service.title}
          </h3>
        </div>

        {/* Best for */}
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-brutal-black/50">
          Best for:{" "}
          <span className="normal-case tracking-normal font-display font-semibold text-brutal-black/70">
            {service.bestFor}
          </span>
        </p>

        {/* Description */}
        <p className="font-display text-sm sm:text-base text-brutal-black/75 leading-relaxed">
          {service.description}
        </p>

        {/* Pricing */}
        <div className="flex items-center gap-2 border-[2px] border-brutal-black bg-brutal-black px-3 py-2 w-fit mt-auto">
          <span className="font-mono text-xs font-bold text-brutal-yellow uppercase tracking-widest">
            {service.pricing}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t-[2px] border-dashed border-brutal-black/20" />

        {/* Deliverables */}
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/40 mb-3">
            What you get
          </p>
          <ul className="flex flex-col gap-2">
            {service.deliverables.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-display text-brutal-black">
                <span
                  className="inline-block w-3.5 h-3.5 flex-shrink-0 mt-0.5 border-[2px] border-brutal-black"
                  style={{ backgroundColor: service.accentHex }}
                />
                <DeliverableText text={item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ── Wild card ("Something Else?") ────────────────────────────────────────────

function WildCard({ index }: { index: number }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      whileHover={{
        x: 3, y: 3,
        boxShadow: "3px 3px 0px 0px rgba(255,230,0,0.5)",
        transition: { duration: 0.1 },
      }}
      className="md:col-span-2 bg-brutal-black border-dashed border-[3px] border-white/30 flex flex-col overflow-hidden cursor-default"
      style={{ boxShadow: "6px 6px 0px 0px rgba(255,230,0,0.35)" }}
    >
      {/* Dashed accent strip */}
      <div className="h-[6px] border-b-[3px] border-dashed border-white/20 flex-shrink-0 bg-brutal-yellow/20" />

      {/* Two-column interior */}
      <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 md:gap-12">

        {/* LEFT */}
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 border-[3px] border-dashed border-white/30">
              <HelpCircle size={32} strokeWidth={2.5} className="text-brutal-yellow" />
            </div>
            <h3 className="font-display font-black text-2xl sm:text-3xl leading-tight text-cream uppercase tracking-tight">
              {wildCard.title}
            </h3>
          </div>

          <p className="font-mono text-xs font-bold uppercase tracking-widest text-white/40">
            Best for:{" "}
            <span className="normal-case tracking-normal font-display font-semibold text-white/60">
              {wildCard.bestFor}
            </span>
          </p>

          <p className="font-display text-sm sm:text-base text-white/65 leading-relaxed whitespace-pre-line flex-1">
            {wildCard.description}
          </p>

          {/* Pricing — no CTA button; the services outro CTA is right below */}
          <div className="border-[2px] border-dashed border-brutal-yellow/50 px-3 py-2 w-fit">
            <span className="font-mono text-xs font-bold text-brutal-yellow uppercase tracking-widest">
              {wildCard.pricing}
            </span>
          </div>
        </div>

        {/* RIGHT — examples */}
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            Things I&apos;ve been asked to do:
          </p>
          <div className="border-t-[2px] border-dashed border-white/15" />
          <ul className="flex flex-col gap-3">
            {wildCard.examples.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-display text-white/60">
                <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-brutal-yellow" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function Services() {
  // Exclude the CTO card from the regular map — it gets its own premium component
  const regularServices = services.filter(s => s.id !== "cto");

  return (
    <section
      id="services"
      className="bg-cream border-b-[3px] border-brutal-black pt-16 pb-20 md:pb-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-14 flex flex-col gap-3">
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            What I Do
          </span>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
            Ways I<br />can help you.
          </h2>
          <p className="font-display text-lg text-brutal-black/60 max-w-xl">
            Pick your problem. I have a solution.
          </p>
        </div>

        {/* Grid:
            Row 1: CTO (full 2-col span) — premium block
            Row 2: MVP / Bots / Payments  (3-col at xl, 2-col at md)
            Row 3: Real Estate / DevOps
            Row 4: Something Else? (full 2-col span)
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <CTOCard />
          {regularServices.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i + 1} />
          ))}
          <WildCard index={regularServices.length + 1} />
        </div>

        {/* Outro CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-16 md:mt-20 border-[3px] border-brutal-black bg-brutal-black p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-brutal-lg"
        >
          <div className="flex flex-col gap-1">
            <p className="font-display font-black text-xl text-cream uppercase tracking-tight">
              Not sure which applies to you?
            </p>
            <p className="font-display text-cream/60 text-sm">
              Most engagements combine 2–3 of these. Let&apos;s talk.
            </p>
          </div>
          <DualCTA
            onBookCall={() => {
              if (typeof window !== "undefined" && (window as any).Calendly) {
                (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
              }
            }}
              quizText="want to figure out the right service? free quiz"
            bookCallLabel="Book a Free 30-min Call →"
            layout="horizontal"
            variant="dark"
          />
        </motion.div>
      </div>
    </section>
  );
}

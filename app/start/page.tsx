"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Minus } from "lucide-react";
import Navigation from "@/components/Navigation";
import { offers, siteConfig } from "@/lib/data";

// ── Offer cards ───────────────────────────────────────────────────────────────
// Same copy and links as the home Offers section, except Audit points at /review.

const FIELD = "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/45";

function offerHref(id: string, fallback: string) {
  return id === "audit" ? "/review" : fallback;
}

// ── General FAQs ──────────────────────────────────────────────────────────────

const generalFAQs = [
  { id: "timezone", q: "What timezone are you in?", a: "I'm based in Spain. I cover EU business hours natively and overlap with US East Coast mornings. For US West Coast clients, I adjust schedule as needed — I've done it for my California engagement without issues." },
  { id: "communication", q: "How do you handle communication?", a: "Slack, Telegram, or whatever your team already uses. Weekly video updates. Async by default, sync when it matters. I don't need you to manage me — I'll tell you what's happening, what's blocked, and what I need from you." },
  { id: "exit", q: "What if it doesn't work out?", a: "No long-term lock-in. Retainers are month-to-month. Project work has defined milestones. If we're not a fit, I'll tell you honestly and help you transition to someone else. I'd rather lose a client cleanly than keep one unhappily." },
  { id: "non-technical", q: "Do you work with non-technical founders?", a: "That's the majority of my clients. I translate technical decisions into business language. You don't need to know React from Redis — you need to know what your product can and can't do, what it'll cost, and when it'll be ready." },
];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormData {
  name: string; email: string; company: string;
  challenge: string; timeline: string; budget: string; context: string;
}
const initialFormData: FormData = {
  name: "", email: "", company: "", challenge: "", timeline: "", budget: "", context: "",
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = "w-full border-[3px] border-brutal-black p-4 font-display text-base bg-white focus:border-brutal-yellow focus:outline-none transition-colors placeholder:text-black/20 resize-none";
const labelCls = "font-mono text-xs uppercase tracking-widest text-black/40 mb-2 block";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StartPage() {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [openFAQs, setOpenFAQs] = useState<Record<string, boolean>>({});

  const openCalendly = useCallback(() => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
    }
  }, []);

  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await fetch("https://formspree.io/f/xqegznkg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) { setPhase("success"); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else setSubmitError(true);
    } catch { setSubmitError(true); }
    finally { setSubmitting(false); }
  }, [formData]);

  const toggleFAQ = useCallback((id: string) => {
    setOpenFAQs((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <>
      <Navigation />

      <main className="min-h-screen pt-16">

        {/* ── SUCCESS ───────────────────────────────────────────────────────── */}
        {phase === "success" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            className="min-h-[calc(100vh-4rem)] bg-cream flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center flex flex-col items-center gap-8">
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
                className="w-16 h-16 border-[3px] border-brutal-black bg-brutal-yellow flex items-center justify-center"
                style={{ boxShadow: "4px 4px 0px 0px #000000" }}>
                <Check size={32} strokeWidth={3} className="text-brutal-black" />
              </motion.div>

              <div className="flex flex-col gap-3">
                <h1 className="font-display font-black text-5xl uppercase text-brutal-black leading-tight">Got it.</h1>
                <p className="font-display text-lg text-black/55 leading-relaxed max-w-sm mx-auto">
                  I&apos;ll review your project details and come prepared to our call — no need to re-explain everything from scratch.
                </p>
              </div>

              <button onClick={openCalendly}
                className="inline-flex items-center justify-center border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black font-display font-black uppercase px-8 py-4 text-base tracking-wide hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all duration-150 cursor-pointer"
                style={{ boxShadow: "6px 6px 0px 0px #000000" }}>
                Book Your Free Call Now →
              </button>

              <p className="font-mono text-xs text-black/30">
                or I&apos;ll reach out within 24 hours
              </p>

              <p className="font-display text-sm text-black/40 italic">Talk soon. — Oleksii</p>
            </div>
          </motion.div>
        )}

        {/* ── FORM ──────────────────────────────────────────────────────────── */}
        {phase === "form" && (
          <>
            {/* Offers */}
            <section className="bg-cream bg-grid border-b-[3px] border-brutal-black">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col gap-10 md:gap-12">
                <div className="flex flex-col gap-5 max-w-3xl">
                  <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
                    Start a Project
                  </span>
                  <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl uppercase tracking-[-0.03em] text-brutal-black leading-[0.95]">
                    What do you need?
                  </h1>
                  <p className="font-display text-lg md:text-xl text-brutal-black/65 leading-relaxed">
                    Three ways to work with me. Pick the one that fits — or just tell me about your project below and I&apos;ll point you the right way.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {offers.map((o) => (
                    <article key={o.id} className="bg-white border-[3px] border-brutal-black shadow-brutal flex flex-col">
                      <div className="h-[6px] border-b-[3px] border-brutal-black" style={{ backgroundColor: o.accentHex }} />
                      <div className="p-6 md:p-7 flex flex-col gap-5 flex-1">
                        <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-[-0.03em] leading-none">{o.name}</h2>
                        <span className="w-fit border-[2px] border-brutal-black bg-brutal-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-brutal-yellow">
                          {o.terms}
                        </span>
                        <div className="flex flex-col gap-1.5">
                          <span className={FIELD}>For</span>
                          <p className="font-display text-base leading-snug text-brutal-black/80">{o.forWho}</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className={FIELD}>You get</span>
                          <p className="font-display text-base leading-snug text-brutal-black/80">{o.youGet}</p>
                        </div>
                        <Link
                          href={offerHref(o.id, o.proof.href)}
                          className="group mt-auto pt-4 border-t-[2px] border-dashed border-brutal-black/20 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:underline underline-offset-4"
                        >
                          {o.proof.label}
                          <span aria-hidden="true" className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">→</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* Form */}
            <section className="bg-cream py-16 md:py-20">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="mb-10">
                  <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-5">
                    Tell me more
                  </span>
                  <h2 className="font-display font-black text-3xl md:text-4xl uppercase text-brutal-black leading-tight">
                    Tell me about your project.
                  </h2>
                  <p className="font-display text-black/50 mt-2 text-base">
                    The more context, the more useful our call will be.{" "}
                    <a href={siteConfig.calendlyUrl} target="_blank" rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-brutal-black transition-colors">
                      Rather just talk?
                    </a>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className={labelCls}>Your Name *</label>
                      <input id="name" name="name" type="text" required
                        placeholder="How should I address you?" value={formData.name}
                        onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="email" className={labelCls}>Email *</label>
                      <input id="email" name="email" type="email" required
                        placeholder="Where should I reply?" value={formData.email}
                        onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className={labelCls}>Company / Project Name</label>
                    <input id="company" name="company" type="text"
                      placeholder="Or describe it in a few words" value={formData.company}
                      onChange={handleFormChange} className={inputCls} />
                  </div>

                  <div>
                    <label htmlFor="challenge" className={labelCls}>
                      What&apos;s your biggest technical challenge right now? *
                    </label>
                    <textarea id="challenge" name="challenge" required rows={4}
                      placeholder="Describe the business problem, not the technical spec. I'll figure out the tech part."
                      value={formData.challenge} onChange={handleFormChange} className={inputCls} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="timeline" className={labelCls}>When do you need this done? *</label>
                      <div className="relative">
                        <select id="timeline" name="timeline" required value={formData.timeline}
                          onChange={handleFormChange}
                          className={`${inputCls} appearance-none pr-10 cursor-pointer`}>
                          <option value="">Select a timeframe…</option>
                          <option>ASAP — weeks</option>
                          <option>1–3 months</option>
                          <option>3–6 months</option>
                          <option>No fixed deadline — planning phase</option>
                        </select>
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/40">▾</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="budget" className={labelCls}>Budget range</label>
                      <div className="relative">
                        <select id="budget" name="budget" value={formData.budget}
                          onChange={handleFormChange}
                          className={`${inputCls} appearance-none pr-10 cursor-pointer`}>
                          <option value="">Monthly or project total…</option>
                          <option>Under $2k</option>
                          <option>$2k–5k</option>
                          <option>$5k–15k</option>
                          <option>$15k+</option>
                          <option>Not sure yet — let&apos;s discuss</option>
                        </select>
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/40">▾</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="context" className={labelCls}>Anything else I should know?</label>
                    <textarea id="context" name="context" rows={3}
                      placeholder="Links to existing product, competitor examples, previous attempts — anything that helps me understand faster."
                      value={formData.context} onChange={handleFormChange} className={inputCls} />
                  </div>

                  {submitError && (
                    <p className="font-mono text-xs text-brutal-red font-bold">
                      Something went wrong. Email me at{" "}
                      <a href={`mailto:${siteConfig.email}`} className="underline">{siteConfig.email}</a>
                      {" "}or find me on{" "}
                      <a href={siteConfig.linkedinUrl} target="_blank" rel="noopener noreferrer" className="underline">LinkedIn</a>.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <motion.button type="submit" disabled={submitting}
                      whileHover={!submitting ? { x: 3, y: 3, boxShadow: "3px 3px 0px 0px #000000" } : {}}
                      whileTap={!submitting ? { x: 6, y: 6, boxShadow: "0px 0px 0px 0px #000000" } : {}}
                      className="inline-flex items-center justify-center border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black font-display font-black uppercase px-8 py-4 text-base tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ boxShadow: "6px 6px 0px 0px #000000" }}>
                      {submitting ? "Sending…" : "Send & Book a Free Call →"}
                    </motion.button>
                    <p className="font-mono text-[10px] text-black/30 uppercase tracking-widest">No spam. Ever.</p>
                  </div>
                </form>
              </div>
            </section>

            {/* General FAQ */}
            <section className="bg-cream pb-24 border-t-[3px] border-brutal-black/10">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
                <div className="flex flex-col gap-2 mb-8">
                  <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
                    More questions
                  </span>
                  <h2 className="font-display font-black text-3xl uppercase">Frequently asked.</h2>
                </div>

                <div className="border-[3px] border-brutal-black bg-white"
                  style={{ boxShadow: "6px 6px 0px 0px #000000" }}>
                  {generalFAQs.map((faq, i) => {
                    const isOpen = !!openFAQs[faq.id];
                    return (
                      <div key={faq.id}
                        className={i < generalFAQs.length - 1 ? "border-b-[2px] border-black/10" : ""}>
                        <button onClick={() => toggleFAQ(faq.id)}
                          className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-brutal-yellow/10 transition-colors cursor-pointer">
                          <span className="font-display font-bold text-sm sm:text-base text-brutal-black">
                            &ldquo;{faq.q}&rdquo;
                          </span>
                          {isOpen
                            ? <Minus size={18} strokeWidth={2.5} className="flex-shrink-0 text-black/50" />
                            : <Plus size={18} strokeWidth={2.5} className="flex-shrink-0 text-black/50" />}
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden">
                              <p className="px-6 pb-5 font-display text-sm text-black/60 leading-relaxed">{faq.a}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

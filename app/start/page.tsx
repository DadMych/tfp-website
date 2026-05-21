"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Plus, Minus, ArrowDown,
  Lightbulb, Wrench, Users, Flame,
  UserX, HelpCircle, UserMinus,
  Zap, Calendar, Map, AlertTriangle,
  Sprout, TrendingUp, Target, Crown,
  Rocket, Shield, Compass, Star,
  type LucideIcon,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { siteConfig } from "@/lib/data";

// ── Quiz data ─────────────────────────────────────────────────────────────────

const QUIZ_ICONS: Record<string, LucideIcon> = {
  Lightbulb, Wrench, Users, Flame,
  UserX, HelpCircle, UserMinus,
  Zap, Calendar, Map, AlertTriangle,
  Sprout, TrendingUp, Target, Crown,
  Rocket, Shield, Compass, Star,
};

const questions = [
  {
    id: 1,
    question: "What's your situation right now?",
    options: [
      { text: "I have an idea but no product yet", value: "idea", icon: "Lightbulb" },
      { text: "I have a product but it's held together with duct tape", value: "duct-tape", icon: "Wrench" },
      { text: "I have a team but no technical leadership", value: "no-cto", icon: "Users" },
      { text: "Everything is on fire and I need help yesterday", value: "fire", icon: "Flame" },
    ],
  },
  {
    id: 2,
    question: "Do you have a development team?",
    options: [
      { text: "No — I need someone to build everything", value: "no-team", icon: "UserX" },
      { text: "Yes, 1–3 developers but no tech lead", value: "small-team", icon: "Users" },
      { text: "Yes, but I'm not sure they're building the right thing", value: "uncertain-team", icon: "HelpCircle" },
      { text: "I had one. They disappeared.", value: "ghosted", icon: "UserMinus" },
    ],
  },
  {
    id: 3,
    question: "What's your timeline?",
    options: [
      { text: "I need something live in weeks", value: "urgent", icon: "Zap" },
      { text: "A few months — I want it done right", value: "normal", icon: "Calendar" },
      { text: "No rush — planning phase", value: "planning", icon: "Map" },
      { text: "We're already behind schedule", value: "behind", icon: "AlertTriangle" },
    ],
  },
  {
    id: 4,
    question: "What's your monthly budget for technical work?",
    options: [
      { text: "Under $2k — I'm bootstrapping", value: "bootstrap", icon: "Sprout" },
      { text: "$2k–5k — early stage but funded", value: "early", icon: "TrendingUp" },
      { text: "$5k–15k — ready to invest in the right person", value: "ready", icon: "Target" },
      { text: "$15k+ — I need a full technical partner", value: "premium", icon: "Crown" },
    ],
  },
  {
    id: 5,
    question: "What matters most to you?",
    options: [
      { text: "Speed — I need to launch fast", value: "speed", icon: "Rocket" },
      { text: "Quality — I need it built right the first time", value: "quality", icon: "Shield" },
      { text: "Strategy — I need someone to tell me WHAT to build", value: "strategy", icon: "Compass" },
      { text: "All of the above, obviously", value: "all", icon: "Star" },
    ],
  },
];

// ── Result logic ──────────────────────────────────────────────────────────────

type ResultKey = "cto" | "mvp" | "rescue" | "consult";

function getResult(answers: Record<number, string>): ResultKey {
  const situation = answers[1];
  const team = answers[2];
  const timeline = answers[3];
  const budget = answers[4];
  const priority = answers[5];

  if (
    situation === "no-cto" ||
    situation === "fire" ||
    team === "uncertain-team" ||
    priority === "strategy"
  ) return "cto";
  if (situation === "idea" && (timeline === "urgent" || timeline === "normal")) return "mvp";
  if (situation === "duct-tape" && team === "ghosted") return "rescue";
  if (budget === "bootstrap") return "consult";
  return "mvp";
}

// ── Result content ────────────────────────────────────────────────────────────

const resultContent: Record<ResultKey, {
  headline: string; subheadline: string; body: string;
  nextSteps: string[]; faqs: { q: string; a: string }[];
}> = {
  cto: {
    headline: "YOU NEED A TECHNICAL\nPARTNER, NOT JUST A CODER.",
    subheadline: "CTO as a Service",
    body: "Based on your answers, you're looking for someone who can own your technical direction — not just write features. That's exactly what CTO as a Service is.",
    nextSteps: [
      "We have a 15-minute call — you talk, I listen",
      "Within 48 hours, you get a clear plan",
      "If it's a fit, we start. If not, you still leave with a better understanding of what you need.",
    ],
    faqs: [
      { q: "How is a fractional CTO different from hiring an agency?", a: "An agency gives you a team that follows your instructions. I give you the person who decides what should be built and how. I own the technical direction, the system design, and the delivery process. An agency owns billable hours." },
      { q: "What if I only need 10 hours a month?", a: "That's fine. Some months are heavy (architecture phase, hiring sprint, launch). Some months are light (monitoring, code reviews, advisory). Retainers flex — we'll figure out the right level on the call." },
      { q: "Can you work with my existing team?", a: "Yes — that's the point. I'm not replacing your developers. I'm giving them direction, code reviews, deployment processes, and someone to escalate to. Most teams perform better with clear technical leadership." },
      { q: "Do you sign NDAs?", a: "Always. Before our first call if you want. Your IP is yours. I've worked under NDA for the majority of my projects — it's standard practice." },
    ],
  },
  mvp: {
    headline: "YOU NEED A PRODUCT,\nNOT A PROTOTYPE.",
    subheadline: "MVP & Product Development",
    body: "You have an idea and a timeline. You need someone who can turn that into a real, deployed, working product — not a demo that falls apart when users show up.",
    nextSteps: [
      "We scope the V1 together — no feature creep",
      "You get a clear timeline and fixed price",
      "I build it, deploy it, hand it off with docs",
    ],
    faqs: [
      { q: "How long does an MVP take?", a: "8–12 weeks for a real product — auth, payments, admin dashboard, deployment pipeline, documentation. If someone tells you 2 weeks, they're building a demo, not a product." },
      { q: "What's included vs what's extra?", a: "V1 includes: core features, user login, payment processing if needed, admin dashboard, live deployment, and documentation. Not included: mobile apps, advanced analytics, AI features. Those are phase 2. We'll define the boundary clearly before starting." },
      { q: "What happens after launch?", a: "I don't disappear. Post-launch support is part of the engagement — bug fixes, monitoring, adjustments based on real user behavior. After that, I can hand off to your team or continue on a lighter retainer." },
    ],
  },
  rescue: {
    headline: "OKAY. LET'S FIGURE OUT\nWHAT YOU ACTUALLY HAVE.",
    subheadline: "Project Rescue & Technical Audit",
    body: "Your previous developer disappeared, your codebase is a mystery, and you need someone who can assess the damage and chart a path forward. I've been here before — it's recoverable.",
    nextSteps: [
      "We start with a technical audit — 3 to 5 days",
      "You get a written report: what works, what's broken, what's next",
      "We agree on a fix plan before touching anything",
    ],
    faqs: [
      { q: "What does a technical audit involve?", a: "I review the source code, server setup, how updates are deployed, and security vulnerabilities. You get a written report: what works, what's broken, what's risky, and a prioritized fix plan. Typically takes 3–5 days." },
      { q: "Can you fix the code my previous developer wrote?", a: "Usually, yes. Sometimes it's more efficient to rebuild specific parts. I'll be honest about which approach makes more sense — and why." },
      { q: "Do you sign NDAs?", a: "Always. Before our first call if you want. Auditing someone else's codebase is sensitive — I treat it accordingly." },
    ],
  },
  consult: {
    headline: "LET'S START WITH\nA CONVERSATION.",
    subheadline: "Technical Consulting",
    body: "Your budget is tight right now — that's completely fine. Not every engagement needs to be a multi-month retainer. Sometimes a single focused session gives you the clarity to move forward with confidence.",
    nextSteps: [
      "Book a focused 60-minute working session",
      "Come with your biggest question or blocker",
      "Leave with a clear path forward",
    ],
    faqs: [
      { q: "What can we cover in one session?", a: "Architecture review, technology stack decisions, team structure advice, hiring plan, vendor evaluation, or just 'here's my situation — what would you do?' One hour of focused advice from someone who's built 30+ products. You'd be surprised how much ground we can cover." },
      { q: "Can this turn into a longer engagement?", a: "Yes, if it makes sense. A lot of my longer clients started with a single consulting session. There's no pressure — I'll tell you honestly when there's more to do and when there isn't." },
    ],
  },
};

// ── General FAQs ──────────────────────────────────────────────────────────────

const generalFAQs = [
  { id: "timezone", q: "What timezone are you in?", a: "I'm based in Spain. I cover EU business hours natively and overlap with US East Coast mornings. For US West Coast clients, I adjust schedule as needed — I've done it for my California engagement without issues." },
  { id: "communication", q: "How do you handle communication?", a: "Slack, Telegram, or whatever your team already uses. Weekly video updates. Async by default, sync when it matters. I don't need you to manage me — I'll tell you what's happening, what's blocked, and what I need from you." },
  { id: "exit", q: "What if it doesn't work out?", a: "No long-term lock-in. Retainers are month-to-month. Project work has defined milestones. If we're not a fit, I'll tell you honestly and help you transition to someone else. I'd rather lose a client cleanly than keep one unhappily." },
  { id: "non-technical", q: "Do you work with non-technical founders?", a: "That's the majority of my clients. I translate technical decisions into business language. You don't need to know React from Redis — you need to know what your product can and can't do, what it'll cost, and when it'll be ready." },
  { id: "hiring", q: "Can you help us hire developers?", a: "Yes. I've built teams up to 18. I can write job descriptions, source candidates, run technical interviews, and onboard new hires into your codebase and processes." },
];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormData {
  name: string; email: string; company: string;
  challenge: string; timeline: string; budget: string; context: string;
}
const initialFormData: FormData = {
  name: "", email: "", company: "", challenge: "", timeline: "", budget: "", context: "",
};

// ── Slide animation ───────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: "easeOut" as const } },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.15, ease: "easeIn" as const } }),
};

// ── Quiz sidebar ──────────────────────────────────────────────────────────────

const SIDEBAR_STATS = [
  { value: "30+", label: "Projects", accent: "#FFE600" },
  { value: "18",  label: "People led",  accent: "#4ECDC4" },
  { value: "6+",  label: "Countries", accent: "#FF6B6B" },
];

function QuizSidebar({ questionIndex }: { questionIndex: number }) {
  const isLateStage = questionIndex >= 3;

  return (
    <div className="hidden lg:block">
      <div className="sticky top-24 border-[3px] border-brutal-yellow overflow-hidden"
        style={{ boxShadow: "6px 6px 0px 0px rgba(255,230,0,0.3)" }}>

        {/* Yellow header */}
        <div className="bg-brutal-yellow border-b-[3px] border-brutal-black px-6 py-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brutal-black/50 mb-1.5">
            Why fill this out?
          </p>
          <p className="font-display font-bold text-sm text-brutal-black leading-snug">
            {isLateStage
              ? "Your answers help me prepare a better proposal. Nothing is binding."
              : "60 seconds of context means our call is about your problem — not introductions."}
          </p>
        </div>

        {/* Checklist */}
        <div className="bg-white border-b-[3px] border-brutal-black px-6 py-5">
          <ul className="flex flex-col gap-3">
            {["No sales pitch", "No spam", "Just context for a better conversation"].map((item) => (
              <li key={item} className="flex items-center gap-3 font-display text-sm text-brutal-black">
                <span className="flex-shrink-0 w-5 h-5 border-[2px] border-brutal-black bg-brutal-yellow flex items-center justify-center">
                  <Check size={11} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="bg-white border-b-[3px] border-brutal-black px-6 py-5">
          <div className="flex flex-col gap-2">
            {SIDEBAR_STATS.map(({ value, label }) => (
              <div key={label}
                className="flex items-center gap-3 border-[3px] border-brutal-black px-4 py-3"
                style={{ boxShadow: "3px 3px 0px 0px #000000" }}>
                <span className="font-display font-black text-2xl leading-none text-brutal-black">
                  {value}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-black/40">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Free call */}
        <div className="bg-white px-6 py-5 flex flex-col gap-1.5">
          <span className="inline-block border-[2px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest w-fit">
            First call is free
          </span>
          <p className="font-mono text-xs text-black/35">
            15 minutes · no commitment · no pitch
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Progress bar (thin top line) ──────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="fixed top-16 left-0 right-0 z-40 h-[3px] bg-white/10">
      <motion.div className="h-full bg-brutal-yellow" initial={false}
        animate={{ width: `${Math.round((current / total) * 100)}%` }}
        transition={{ duration: 0.35, ease: "easeOut" }} />
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = "w-full border-[3px] border-brutal-black p-4 font-display text-base bg-white focus:border-brutal-yellow focus:outline-none transition-colors placeholder:text-black/20 resize-none";
const labelCls = "font-mono text-xs uppercase tracking-widest text-black/40 mb-2 block";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StartPage() {
  const [phase, setPhase] = useState<"intro" | "quiz" | "result" | "success">("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<ResultKey | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [openFAQs, setOpenFAQs] = useState<Record<string, boolean>>({});

  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const openCalendly = useCallback(() => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
    }
  }, []);

  const handleAnswer = useCallback((questionId: number, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    if (questionIndex < questions.length - 1) {
      setTimeout(() => { setSlideDir(1); setQuestionIndex((i) => i + 1); }, 220);
    } else {
      const r = getResult(newAnswers);
      setResult(r);
      setTimeout(() => {
        setPhase("result");
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }, 300);
    }
  }, [answers, questionIndex]);

  const goBack = useCallback(() => {
    setSlideDir(-1);
    setQuestionIndex((i) => i - 1);
  }, []);

  const goToStep = useCallback((idx: number) => {
    setSlideDir(idx < questionIndex ? -1 : 1);
    setQuestionIndex(idx);
  }, [questionIndex]);

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
        body: JSON.stringify({ ...formData, quizResult: result, quizAnswers: answers }),
      });
      if (res.ok) { setPhase("success"); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else setSubmitError(true);
    } catch { setSubmitError(true); }
    finally { setSubmitting(false); }
  }, [formData, result, answers]);

  const toggleFAQ = useCallback((id: string) => {
    setOpenFAQs((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const currentQuestion = questions[questionIndex];
  const resultData = result ? resultContent[result] : null;

  return (
    <>
      <Navigation />
      {phase === "quiz" && <ProgressBar current={questionIndex + 1} total={questions.length} />}

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
                  I'll review your project details and come prepared to our call — no need to re-explain everything from scratch.
                </p>
              </div>

              <button onClick={openCalendly}
                className="inline-flex items-center justify-center border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black font-display font-black uppercase px-8 py-4 text-base tracking-wide hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all duration-150 cursor-pointer"
                style={{ boxShadow: "6px 6px 0px 0px #000000" }}>
                Book Your Free Call Now →
              </button>

              <p className="font-mono text-xs text-black/30">
                or I'll reach out within 24 hours
              </p>

              <p className="font-display text-sm text-black/40 italic">Talk soon. — Oleksii</p>
            </div>
          </motion.div>
        )}

        {/* ── INTRO ─────────────────────────────────────────────────────────── */}
        {phase === "intro" && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            className="bg-cream bg-grid min-h-[calc(100vh-4rem)] flex items-center border-b-[3px] border-brutal-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 lg:gap-16 items-start">

                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="flex flex-col gap-7">
                  <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
                    Start a Project
                  </span>

                  <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl uppercase tracking-[-0.03em] text-brutal-black leading-[0.95]">
                    Let&apos;s figure out<br />what you need.
                  </h1>

                  <p className="font-mono text-sm text-black/50 tracking-wide">
                    5 questions. 60 seconds.
                  </p>

                  <div className="flex flex-col items-start gap-3">
                    <motion.button
                      whileHover={{ x: 3, y: 3, boxShadow: "3px 3px 0px 0px #000000" }}
                      whileTap={{ x: 6, y: 6, boxShadow: "none" }}
                      onClick={() => setPhase("quiz")}
                      className="inline-flex items-center justify-center border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black font-display font-black uppercase px-8 py-4 text-lg tracking-wide cursor-pointer"
                      style={{ boxShadow: "6px 6px 0px 0px #000000" }}>
                      Start the Quiz →
                    </motion.button>

                    <a href={siteConfig.calendlyUrl} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-sm text-black/40 underline underline-offset-2 hover:text-black/70 transition-colors">
                      Skip — book a free call directly →
                    </a>
                  </div>
                </motion.div>

                <QuizSidebar questionIndex={-1} />
              </div>
            </div>
          </motion.section>
        )}

        {/* ── QUIZ ──────────────────────────────────────────────────────────── */}
        {phase === "quiz" && (
          <section className="bg-cream min-h-[calc(100vh-4rem)] py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

              {/* Mobile free-call bar */}
              <div className="lg:hidden mb-6 border-[2px] border-brutal-black bg-brutal-yellow py-2.5 px-4 text-center">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brutal-black">
                  First call is free · 15 min · no commitment
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 lg:gap-16 items-start">

                {/* Left — questions */}
                <div>
                  {/* Step indicators */}
                  <div className="flex gap-2 mb-10">
                    {questions.map((q, idx) => {
                      const isCurrent = idx === questionIndex;
                      const isPast = idx < questionIndex;
                      return (
                        <button key={q.id}
                          onClick={() => isPast && goToStep(idx)}
                          disabled={!isPast}
                          className={`w-10 h-10 border-[2px] font-mono text-[11px] font-bold flex items-center justify-center transition-all duration-150 ${
                            isCurrent
                              ? "bg-brutal-yellow border-brutal-black text-brutal-black"
                              : isPast
                              ? "bg-brutal-black border-brutal-black text-brutal-yellow cursor-pointer hover:opacity-80"
                              : "bg-transparent border-brutal-black/20 text-brutal-black/20 cursor-default"
                          }`}>
                          {String(idx + 1).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait" custom={slideDir}>
                    <motion.div key={currentQuestion.id} custom={slideDir}
                      variants={slideVariants} initial="enter" animate="center" exit="exit">

                      {/* Question text — no card box */}
                      <h2 className="font-display font-black text-2xl md:text-3xl text-brutal-black mb-8 leading-tight">
                        {currentQuestion.question}
                      </h2>

                      {/* Option cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentQuestion.options.map((opt) => {
                          const selected = answers[currentQuestion.id] === opt.value;
                          const Icon = opt.icon ? QUIZ_ICONS[opt.icon] : null;
                          return (
                            <motion.button key={opt.value} whileTap={{ scale: 0.98 }}
                              onClick={() => handleAnswer(currentQuestion.id, opt.value)}
                              className={`group relative p-6 border-[3px] border-brutal-black text-left transition-all duration-150 cursor-pointer min-h-[100px] ${
                                selected
                                  ? "bg-brutal-yellow shadow-none translate-x-[4px] translate-y-[4px]"
                                  : "bg-white shadow-brutal hover:shadow-brutal-hover hover:translate-x-[2px] hover:translate-y-[2px]"
                              }`}>
                              {/* Icon — top right */}
                              {Icon && (
                                <div className={`absolute top-4 right-4 transition-colors ${
                                  selected ? "text-brutal-black/40" : "text-brutal-black/12 group-hover:text-brutal-black/25"
                                }`}>
                                  <Icon size={22} strokeWidth={1.5} />
                                </div>
                              )}

                              <p className="font-display font-bold text-base md:text-lg pr-12 leading-snug text-brutal-black">
                                {opt.text}
                              </p>

                              {/* Selected check */}
                              {selected && (
                                <div className="absolute bottom-3 right-3">
                                  <Check size={18} strokeWidth={3} className="text-brutal-black" />
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Back + skip */}
                  <div className="mt-8 flex flex-col items-start gap-4">
                    {questionIndex > 0 && (
                      <button onClick={goBack}
                        className="font-mono text-xs text-black/30 hover:text-black/60 transition-colors underline underline-offset-2">
                        ← Back
                      </button>
                    )}
                    <a href={siteConfig.calendlyUrl} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs text-black/20 underline underline-offset-2 hover:text-black/50 transition-colors">
                      Already know what you need? Skip to booking →
                    </a>
                  </div>
                </div>

                <QuizSidebar questionIndex={questionIndex} />
              </div>
            </div>
          </section>
        )}

        {/* ── RESULT + FORM ─────────────────────────────────────────────────── */}
        {phase === "result" && resultData && (
          <motion.div ref={resultRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

            {/* Result section */}
            <section className="bg-cream py-20">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                <p className="font-mono text-xs text-black/30 uppercase tracking-[0.2em] mb-8">
                  Based on your answers:
                </p>

                {/* Yellow verdict card */}
                <div className="bg-brutal-yellow border-[3px] border-brutal-black p-8 md:p-12 mb-12"
                  style={{ boxShadow: "8px 8px 0px 0px #000000" }}>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brutal-black/45 mb-3">
                    {resultData.subheadline}
                  </p>
                  <h2 className="font-display font-black text-3xl md:text-5xl text-brutal-black uppercase leading-[0.95]"
                    style={{ whiteSpace: "pre-line" }}>
                    {resultData.headline}
                  </h2>
                </div>

                {/* Body */}
                <p className="font-display text-lg text-black/65 leading-relaxed mb-10 max-w-2xl">
                  {resultData.body}
                </p>

                {/* Next steps */}
                <div className="mb-12">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/40 mb-5">
                    What happens next
                  </p>
                  <ul className="flex flex-col gap-3">
                    {resultData.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 font-display text-sm text-black/70">
                        <span className="flex-shrink-0 w-5 h-5 border-[2px] border-brutal-black bg-brutal-yellow text-brutal-black font-mono text-[10px] font-black flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* FAQs */}
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/40 mb-6">
                    Questions you&apos;re probably already thinking
                  </p>
                  <div className="flex flex-col">
                    {resultData.faqs.map((faq, i) => (
                      <div key={i}
                        className="border-l-[4px] border-brutal-yellow pl-6 py-5 border-b border-black/10">
                        <p className="font-display font-bold text-brutal-black text-base mb-2">
                          &ldquo;{faq.q}&rdquo;
                        </p>
                        <p className="font-display text-black/60 text-sm leading-relaxed">
                          {faq.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Transition strip */}
            <div className="bg-cream py-10 border-t-[3px] border-brutal-black/10 flex flex-col items-center gap-3">
              <p className="font-display font-black text-2xl uppercase text-brutal-black tracking-tight">
                Ready? Let&apos;s get specific.
              </p>
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowDown size={24} strokeWidth={2.5} className="text-black/30" />
              </motion.div>
              <a href={siteConfig.calendlyUrl} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-black/30 underline underline-offset-2 hover:text-black/60 transition-colors">
                Want to skip the form? Book a call directly →
              </a>
              <a href={siteConfig.linkedinUrl} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-black/30 underline underline-offset-2 hover:text-black/60 transition-colors">
                LinkedIn →
              </a>
            </div>

            {/* Cream form section */}
            <section ref={formRef} className="bg-cream py-16">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="mb-10">
                  <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-5">
                    Tell me more
                  </span>
                  <h3 className="font-display font-black text-3xl md:text-4xl uppercase text-brutal-black leading-tight">
                    Tell me about your project.
                  </h3>
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
                  <h3 className="font-display font-black text-3xl uppercase">Frequently asked.</h3>
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
          </motion.div>
        )}
      </main>
    </>
  );
}

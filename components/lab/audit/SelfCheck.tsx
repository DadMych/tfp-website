"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FINDINGS } from "@/lib/audit/findings";
import { SELF_CHECK, type SelfQ } from "@/lib/audit/story";
import { labPost } from "@/lib/lab/client";
import { siteConfig } from "@/lib/data";

const byId = Object.fromEntries(FINDINGS.map((f) => [f.id, f]));
const label = "font-mono text-[11px] font-bold uppercase tracking-[0.25em]";

type Answer = "yes" | "no" | "unsure";
const OPTIONS: { v: Answer; t: string }[] = [
  { v: "yes", t: "Yes" },
  { v: "no", t: "No" },
  { v: "unsure", t: "Not sure" },
];

function isProblem(q: SelfQ, a: Answer): boolean {
  return q.bad === "yes" ? a === "yes" : a === "no" || a === "unsure";
}

export default function SelfCheck() {
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = Object.keys(answers).length === SELF_CHECK.length;

  const matched = useMemo(
    () => SELF_CHECK.filter((q) => answers[q.id] && isProblem(q, answers[q.id])).map((q) => byId[q.finding]).filter(Boolean),
    [answers]
  );

  const submit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
    labPost("/api/lab/audit", null, { action: "selfcheck" }).catch(() => {});
  };

  const n = matched.length;

  return (
    <section id="self-check" className="scroll-mt-20 flex flex-col gap-6">
      <div className="flex flex-col gap-2 max-w-3xl">
        <span className={`${label} text-brutal-black/55`}>Your app</span>
        <h2 className="font-display font-black uppercase tracking-[-0.03em] leading-[0.95] text-3xl md:text-5xl">
          Does yours have the same problems?
        </h2>
        <p className="font-display text-base md:text-lg leading-snug text-brutal-black/75">
          10 questions, plain English, no email. Nothing is stored or sent — the answers live only on this page.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {SELF_CHECK.map((q, i) => {
          const a = answers[q.id];
          return (
            <li key={q.id} className="border-[3px] border-brutal-black bg-white p-4 flex flex-col gap-3">
              <p className="font-display text-base md:text-lg leading-snug">
                <span className="font-mono text-[12px] font-bold text-brutal-black/40 mr-2">{String(i + 1).padStart(2, "0")}</span>
                {q.text}
              </p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map((o) => {
                  const on = a === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: o.v }))}
                      aria-pressed={on}
                      className={`h-9 px-4 border-[3px] border-brutal-black font-display font-black uppercase text-sm ${on ? "bg-brutal-black text-cream" : "bg-white hover:bg-cream"}`}
                    >
                      {o.t}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered}
          className="w-full md:w-auto md:self-start border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase tracking-[-0.01em] px-8 py-4 text-lg shadow-[5px_5px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:shadow-none"
        >
          {allAnswered ? "See my result →" : `Answer all 10 (${Object.keys(answers).length}/10)`}
        </button>
      ) : (
        <div className="border-[3px] border-brutal-black bg-brutal-black text-cream p-6 md:p-7 flex flex-col gap-5 shadow-[6px_6px_0_0_#000]">
          <p className="font-display font-black uppercase tracking-[-0.02em] leading-[0.95] text-2xl md:text-4xl">
            {n === 0 ? (
              <>Your app has none of Northwind&apos;s 12 problems. Nice.</>
            ) : (
              <>Your app probably has {n} of Northwind&apos;s 12 problems.</>
            )}
          </p>

          {n > 0 && (
            <ul className="flex flex-wrap gap-2">
              {matched.map((f) => (
                <li key={f.id}>
                  <Link
                    href={f.chapter?.href ?? "/lab/audit/report"}
                    className="inline-block border-[3px] border-cream/40 px-3 py-1.5 font-display font-bold text-sm hover:bg-cream hover:text-brutal-black"
                  >
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="font-display text-base leading-snug text-cream/75">
            It&apos;s &ldquo;probably&rdquo;, not a diagnosis — a real audit reads the code. If any of these sound like your app, that&apos;s what the audit is for.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/review"
              className="inline-flex items-center border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-display font-black uppercase tracking-[-0.01em] px-6 py-3 text-base md:text-lg active:translate-x-[3px] active:translate-y-[3px]"
            >
              Get the audit · from 5 working days · from €3,300
            </Link>
            <a
              href={siteConfig.calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] border-b-[3px] border-cream/50 hover:border-cream"
            >
              Book a free 30-min call →
            </a>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
            }}
            className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cream/50 hover:text-cream underline underline-offset-4"
          >
            ⟲ Start over
          </button>
        </div>
      )}
    </section>
  );
}

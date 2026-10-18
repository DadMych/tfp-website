import type { Metadata } from "next";
import Link from "next/link";
import { labMeta } from "@/lib/lab-og";
import AuditShell from "@/components/lab/audit/AuditShell";
import ShowMe from "@/components/lab/audit/ShowMe";
import { Section } from "@/components/lab/money/ui";
import { T } from "@/components/lab/money/Explain";
import { bySeverity, SEVERITY, type Finding } from "@/lib/audit/findings";
import { offer } from "@/lib/review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/audit/after",
  "After the Report — The Audit",
  "The fixes in the order they went in and why: criticals first. The same “Show me” buttons, run against the fixed version, find nothing. Launch: yes."
);

const label = "font-mono text-[11px] font-bold uppercase tracking-[0.25em]";

const ORDER = ["critical", "high", "medium", "low"] as const;

const strip = (s: string) => s.replace(/^TODO\(oleksii\):\s*/, "");

export default function AfterPage() {
  const ranked: Finding[] = ORDER.flatMap((s) => bySeverity(s));
  const terms = [offer.duration, offer.price]
    .filter((t) => !t.startsWith("TODO"))
    .map(strip)
    .join(" · ");
  return (
    <AuditShell slug="after">
      <Section
        n="01"
        tone="tile"
        title="After the report"
        plainTitle="After the report"
        lede="Fixes go in worst first, and for one reason: the top of the list loses money or data with no effort from anyone. A forged message or a changed number costs nothing to try, so those close before anything else."
        plainLede="Fixes go worst-first for one reason: the problems at the top lose money or data with no effort at all. A faked message or a changed number is free to try, so they get closed first."
      >
        <ol className="flex flex-col">
          {ranked.map((f, i) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 border-b border-brutal-black/15 last:border-b-0">
              <span className="font-mono text-[12px] font-bold w-6 text-brutal-black/50">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 border-2 border-brutal-black" style={{ background: SEVERITY[f.severity].bg, color: SEVERITY[f.severity].ink }}>
                {SEVERITY[f.severity].label}
              </span>
              <span className="font-display font-bold leading-tight flex-1 min-w-[12rem]">{f.title}</span>
              <span className="font-display text-sm text-brutal-black/70 flex-1 min-w-[14rem]">{f.fix}</span>
              {f.chapter && (
                <Link href={f.chapter.href} className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] border-b-2 border-brutal-black hover:bg-brutal-yellow">
                  {f.chapter.n} →
                </Link>
              )}
            </li>
          ))}
        </ol>
        <p className="font-display text-sm text-brutal-black/70 mt-4 leading-snug">
          <T
            tech="Each fix is the “careful” version built in the chapter it links to — real code already in this lab, not a sketch. The diff and the measured before/after live there."
            plain="Each fix is the “careful” version built in the chapter it links to — real code already in this lab, not a drawing. The change and the before/after are on that page."
          />
        </p>
      </Section>

      <Section
        n="02"
        title="The same buttons, on the fixed version"
        plainTitle="The same buttons, now fixed"
        lede="Press the same reproductions from the report. The right-hand column is the fixed cabinet: the number doesn't open, the forged message is ignored, the second tap is a no-op."
        plainLede="Press the same buttons from the report. The right-hand side is the fixed cabinet: the wrong number won't open, the fake message is ignored, the second tap does nothing."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <span className={`${label} opacity-55`}>Change the number</span>
            <ShowMe show={{ kind: "inline", action: "invoice" }} />
          </div>
          <div className="flex flex-col gap-2">
            <span className={`${label} opacity-55`}>Forged “paid”</span>
            <ShowMe show={{ kind: "inline", action: "webhook" }} />
          </div>
          <div className="flex flex-col gap-2">
            <span className={`${label} opacity-55`}>Double-tap Pay</span>
            <ShowMe show={{ kind: "inline", action: "pay" }} />
          </div>
          <div className="flex flex-col gap-2">
            <span className={`${label} opacity-55`}>Split a bill</span>
            <ShowMe show={{ kind: "inline", action: "float" }} />
          </div>
        </div>
      </Section>

      <section className="border-[3px] border-brutal-black bg-[#C6FF3D] p-6 md:p-8 flex flex-col gap-4">
        <span className={`${label}`}>Launch: yes</span>
        <h2 className="font-display font-black uppercase tracking-[-0.03em] text-3xl md:text-4xl leading-[0.9]">The three went in. The cabinet shipped.</h2>
        <p className="font-display text-base md:text-lg leading-snug max-w-2xl">
          <T
            tech="Once a client can't open another's invoice, a forged message can't mark one paid, and the key is off the browser, the rest are schedule, not blockers."
            plain="Once a client can't open someone else's invoice, a fake message can't mark one paid, and the key is off the web page, the rest are things to schedule, not reasons to wait."
          />
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/review" className="inline-flex items-center gap-2 h-12 px-5 border-[3px] border-brutal-black bg-brutal-black text-cream font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            Want this report for your app? →
          </Link>
          {terms && <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] self-center opacity-70">{terms}</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/lab/audit/report/sample" className="inline-flex items-center gap-2 h-11 px-4 border-[3px] border-brutal-black bg-white font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow">
            Read the sample report →
          </Link>
          <a href="/audit-sample-report.pdf" className="inline-flex items-center gap-2 h-11 px-4 border-[3px] border-brutal-black bg-white font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow">
            Download it as PDF ↓
          </a>
        </div>
      </section>
    </AuditShell>
  );
}

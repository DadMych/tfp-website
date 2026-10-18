import type { Metadata } from "next";
import Link from "next/link";
import { labMeta } from "@/lib/lab-og";
import AuditShell from "@/components/lab/audit/AuditShell";
import FindingsList from "@/components/lab/audit/FindingsList";
import { Section } from "@/components/lab/money/ui";
import { T } from "@/components/lab/money/Explain";
import { bySeverity, COUNTS, COVERED, FINDINGS, SEVERITY } from "@/lib/audit/findings";
import { AUDIT_RUN } from "@/lib/audit/run";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/audit/report",
  "The Report — The Audit",
  "The whole audit on one page: what I checked, how long it took, and every finding ranked Critical to Low. Each one reproduces live on the broken cabinet."
);

const label = "font-mono text-[11px] font-bold uppercase tracking-[0.25em]";

export default function ReportPage() {
  const criticals = bySeverity("critical");
  return (
    <AuditShell slug="report">
      <Section
        n="01"
        tone="tile"
        title="The report"
        plainTitle="The report"
        lede="A week before launch, I spent five days on Northwind's new client cabinet: how you log in, how invoices open, how a payment is taken, and the support bot. Here is everything I found, ranked, with a button on each that reproduces it on the broken cabinet."
        plainLede="A week before launch I spent five days on Northwind's new client cabinet — logging in, opening invoices, paying, and the help bot. Here is everything I found, worst first, each with a button that shows it happening for real."
      >
        <div className="flex flex-col gap-5">
          {/* Verdict */}
          <div className="border-[3px] border-brutal-black bg-brutal-black text-cream p-5 md:p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`${label} px-2 py-1 bg-[#FF3B3B] text-cream`}>Launch: not yet</span>
              <span className="font-display font-black uppercase tracking-[-0.02em] text-xl md:text-2xl">Three things first.</span>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {criticals.map((f, i) => (
                <li key={f.id} className="border-[3px] border-cream/30 p-3 flex flex-col gap-1">
                  <span className="font-mono text-[11px] font-bold text-[#FF8A3D]">0{i + 1}</span>
                  <span className="font-display font-bold leading-snug">{f.title}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* The numbers */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
            <div className="border-[3px] border-brutal-black bg-white p-4 flex flex-col gap-3">
              <span className={`${label} opacity-55`}>Findings by severity</span>
              <div className="flex gap-2">
                {(["critical", "high", "medium", "low"] as const).map((s) => (
                  <div key={s} className="flex flex-col items-center gap-1 flex-1">
                    <span className="w-full h-12 flex items-center justify-center border-[3px] border-brutal-black font-display font-black text-2xl" style={{ background: SEVERITY[s].bg, color: SEVERITY[s].ink }}>
                      {COUNTS[s]}
                    </span>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em]">{SEVERITY[s].label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-[3px] border-brutal-black bg-white p-4 flex flex-col justify-center gap-2 font-display leading-snug">
              <p>
                <span className="font-black">{COVERED} of {FINDINGS.length}</span>{" "}
                <T tech="are taken apart in full in Parts 1–4. The rest are new to this cabinet." plain="already have a whole chapter in Parts 1–4. The rest are new to this cabinet." />
              </p>
              <p>
                <T
                  tech={`Automatic tools found ${AUDIT_RUN.foundByTools} of these ${FINDINGS.length}: the dependency scanner flagged ${AUDIT_RUN.tools.depAdvisories} framework advisories, the secret scanner ${AUDIT_RUN.tools.secretsInCode} in the code. Every finding here came from reading the code.`}
                  plain={`The automatic tools found ${AUDIT_RUN.foundByTools} of these ${FINDINGS.length}. They flag out-of-date libraries and stray passwords, not bugs in how money and files move. All of these came from reading the code.`}
                />
              </p>
            </div>
          </div>
        </div>
      </Section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className={`${label} border-t-[3px] border-brutal-black pt-4`}>02 · The findings</span>
          <p className="font-display text-base md:text-lg leading-snug max-w-3xl text-brutal-black/75">
            <T
              tech="Worst first. Each finding: what's wrong, what it means for Northwind, a button that reproduces it, and the one-line fix with a link to the chapter that goes deep."
              plain="Worst first. Each one: what's wrong, what it means for Northwind, a button that shows it happening, and the fix in one line with a link to the chapter that explains it."
            />
          </p>
        </div>
        <FindingsList />
      </section>

      <section className="flex flex-col gap-3 border-t-[3px] border-brutal-black pt-6">
        <span className={`${label} opacity-55`}>Next</span>
        <div className="flex flex-wrap gap-4">
          <Link href="/lab/audit/five-days" className="font-display font-black uppercase tracking-[-0.02em] text-xl border-b-[3px] border-brutal-black hover:bg-brutal-yellow">
            5.2 Five Days →
          </Link>
          <Link href="/lab/audit/after" className="font-display font-black uppercase tracking-[-0.02em] text-xl border-b-[3px] border-brutal-black hover:bg-brutal-yellow">
            5.3 After the Report →
          </Link>
        </div>
      </section>
    </AuditShell>
  );
}

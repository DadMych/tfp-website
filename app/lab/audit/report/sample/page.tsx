import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLiveDemo } from "@/lib/lab-config";
import { bySeverity, COUNTS, COVERED, FINDINGS, SEVERITY, type Severity } from "@/lib/audit/findings";
import { AUDIT_RUN } from "@/lib/audit/run";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sample audit report — Northwind Studio client cabinet",
  description: "A full application audit report, start to finish: verdict, findings ranked Critical to Low, and the fix for each.",
  robots: { index: false },
};

const ORDER: Severity[] = ["critical", "high", "medium", "low"];

export default function SampleReportPage() {
  if (!getLiveDemo("audit")) notFound();
  const criticals = bySeverity("critical");

  return (
    <main className="bg-white text-brutal-black">
      <style>{`@page { size: A4; margin: 14mm; } @media print { .no-print { display: none !important; } body { background: #fff; } body::after, body::before { display: none !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b-[3px] border-brutal-black bg-brutal-yellow px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
        <span>Sample report · the real deliverable</span>
        <span>Print this page to save it as a PDF</span>
      </div>

      <article className="mx-auto flex max-w-[820px] flex-col gap-8 px-6 py-10 md:px-10 md:py-14">
        {/* masthead */}
        <header className="flex flex-col gap-4 border-b-[3px] border-brutal-black pb-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-brutal-black/55">Application Audit · Sample</span>
          <h1 className="font-display font-black uppercase leading-[0.9] tracking-[-0.03em] text-4xl md:text-5xl">
            Northwind Studio
            <br />
            client cabinet
          </h1>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-[12px] sm:grid-cols-4">
            <Meta label="Scope" value="Access · payments · the AI · data · infra" />
            <Meta label="Took" value={`${AUDIT_RUN.days} working days`} />
            <Meta label="Reviewer" value="Independent audit" />
            <Meta label="Findings" value={`${FINDINGS.length} ranked`} />
          </dl>
        </header>

        {/* verdict */}
        <section className="flex flex-col gap-4 border-[3px] border-brutal-black bg-brutal-black p-6 text-cream">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#FF3B3B] px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-cream">Launch: not yet</span>
            <span className="font-display text-xl font-black uppercase tracking-[-0.02em] md:text-2xl">Three things first.</span>
          </div>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {criticals.map((f, i) => (
              <li key={f.id} className="flex flex-col gap-1 border-[3px] border-cream/30 p-3">
                <span className="font-mono text-[11px] font-bold text-[#FF8A3D]">0{i + 1}</span>
                <span className="font-display font-bold leading-snug">{f.title}</span>
              </li>
            ))}
          </ol>
          <p className="font-display leading-snug text-cream/80">
            Fix these three and the cabinet is safe to launch. The rest are schedule, not blockers.
          </p>
        </section>

        {/* summary */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-black uppercase tracking-[-0.02em]">Summary</h2>
          <div className="flex gap-2">
            {ORDER.map((s) => (
              <div key={s} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="flex h-14 w-full items-center justify-center border-[3px] border-brutal-black font-display text-2xl font-black"
                  style={{ background: SEVERITY[s].bg, color: SEVERITY[s].ink }}
                >
                  {COUNTS[s]}
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">{SEVERITY[s].label}</span>
              </div>
            ))}
          </div>
          <p className="font-display leading-snug text-brutal-black/80">
            Automatic tools found {AUDIT_RUN.foundByTools} of these {FINDINGS.length}. The dependency scanner flagged{" "}
            {AUDIT_RUN.tools.depAdvisories} out-of-date-library advisories and the secret scanner found{" "}
            {AUDIT_RUN.tools.secretsInCode} stray keys — but none of these findings, which are about how money, access and
            files move. Every one came from reading the code by hand. {COVERED} of {FINDINGS.length} are the same class of
            bug this studio has written up before.
          </p>
        </section>

        {/* findings */}
        <section className="flex flex-col gap-6">
          <h2 className="font-display text-2xl font-black uppercase tracking-[-0.02em] border-t-[3px] border-brutal-black pt-6">
            Findings
          </h2>
          {ORDER.map((s) => (
            <div key={s} className="flex flex-col gap-4">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/55">
                {SEVERITY[s].label} · {COUNTS[s]}
              </h3>
              {bySeverity(s).map((f, i) => (
                <div
                  key={f.id}
                  className="flex flex-col gap-2 border-[3px] border-brutal-black p-5"
                  style={{ breakInside: "avoid" }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] border-2 border-brutal-black"
                      style={{ background: SEVERITY[f.severity].bg, color: SEVERITY[f.severity].ink }}
                    >
                      {SEVERITY[f.severity].label}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-brutal-black/45">
                      {SEVERITY[f.severity].label.charAt(0)}
                      {i + 1}
                    </span>
                    <h4 className="font-display text-lg font-black leading-tight tracking-[-0.01em]">{f.title}</h4>
                  </div>
                  <p className="font-display leading-snug">{f.whatPlain}</p>
                  <p className="font-display leading-snug text-brutal-black/75">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">For Northwind: </span>
                    {f.soWhat}
                  </p>
                  <p className="font-display leading-snug">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">Fix: </span>
                    {f.fix}
                  </p>
                  {f.chapter && (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-brutal-black/45">
                      Reference: {f.chapter.n} {f.chapter.label}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* footer */}
        <footer className="flex flex-col gap-2 border-t-[3px] border-brutal-black pt-6 font-display leading-snug text-brutal-black/75">
          <p className="font-black text-brutal-black">This is a sample. Yours would be about your app.</p>
          <p>
            The cabinet above is real and deliberately broken; every finding reproduces live in the lab. A report on your
            own code reads the same way: ranked, with the fix and a way to reproduce each one.
          </p>
        </footer>
      </article>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-bold uppercase tracking-[0.2em] text-[10px] text-brutal-black/50">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

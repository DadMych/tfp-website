import type { Metadata } from "next";
import Link from "next/link";
import { labMeta } from "@/lib/lab-og";
import AuditShell from "@/components/lab/audit/AuditShell";
import { Section } from "@/components/lab/money/ui";
import { T } from "@/components/lab/money/Explain";
import { AUDIT_RUN } from "@/lib/audit/run";
import { FINDINGS, SEVERITY, type Finding } from "@/lib/audit/findings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/audit/five-days",
  "Five Days — The Audit",
  "How the audit ran, day by day: access and a map, then money, then the AI and the data, then the infrastructure, then the report. What the tools found, and what only reading the code found."
);

const label = "font-mono text-[11px] font-bold uppercase tracking-[0.25em]";

const pick = (...ids: string[]) => ids.map((id) => FINDINGS.find((f) => f.id === id)!).filter(Boolean) as Finding[];

const DAYS = [
  {
    when: "Day 1",
    title: "Access, and a map",
    what: "Read access to the repo, the cabinet running on my own machine, and an hour drawing how it fits together: where you log in, where the invoices live, who talks to the database.",
    plain: "I got into the code, ran the cabinet on my own laptop, and spent an hour mapping how it all fits together.",
    found: pick("db-key", "no-staging"),
  },
  {
    when: "Day 2",
    title: "Money and access",
    what: "The paths money and invoices take: the pay button, the payment webhook, how an invoice page decides what you may see, and what stops a password from being guessed.",
    plain: "How money and invoices move: paying, the “you've paid” message from the provider, who can open which invoice, and what stops password guessing.",
    found: pick("invoice-idor", "webhook-unsigned", "double-pay", "float-cents", "no-rate-limits"),
  },
  {
    when: "Day 3",
    title: "The AI and the data",
    what: "What the support bot reads to answer a question, and what leaves the building for the model when a brief has personal data in it.",
    plain: "What the help bot reads to answer, and what gets sent to the AI when a brief contains personal data.",
    found: pick("bot-reads-all", "pii-to-ai"),
  },
  {
    when: "Day 4",
    title: "Infrastructure",
    what: "Backups and whether a restore was ever tried, the one production environment, what the logs keep, and the file links that outlive the people who were given them.",
    plain: "Backups and whether anyone has restored one, the single live environment, what ends up in the logs, and file links that keep working forever.",
    found: pick("untested-restore", "secrets-logs", "eternal-links"),
  },
  {
    when: "Day 5",
    title: "The report, and the call",
    what: "This report, ranked, with a reproduction for each finding — and an hour on a call to walk through what to fix first.",
    plain: "This report, worst first, with a button for each — and an hour on a call to talk through what to fix first.",
    found: [],
  },
] as const;

export default function FiveDaysPage() {
  return (
    <AuditShell slug="five-days">
      <Section
        n="01"
        tone="tile"
        title="Five days"
        plainTitle="Five days"
        lede="This answers the question a client asks before they say yes: what do I actually get for the money? Five days, in this order, on the broken cabinet."
        plainLede="This is the answer to “what do I get for the money?”. Five days, in this order, on the broken cabinet."
      >
        <ol className="flex flex-col gap-4">
          {DAYS.map((d) => (
            <li key={d.when} className="border-[3px] border-brutal-black bg-white p-4 md:p-5 flex flex-col gap-3 shadow-[6px_6px_0_0_#000]">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className={`${label} px-2 py-1 bg-brutal-black text-cream`}>{d.when}</span>
                <h3 className="font-display font-black uppercase tracking-[-0.02em] text-xl md:text-2xl leading-none">{d.title}</h3>
              </div>
              <p className="font-display text-base leading-snug text-brutal-black/85">
                <T tech={d.what} plain={d.plain} />
              </p>
              {d.found.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t-[2px] border-dashed border-brutal-black/20">
                  {d.found.map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold border-2 border-brutal-black px-2 py-0.5">
                      <span className="size-2.5 border border-brutal-black" style={{ background: SEVERITY[f.severity].bg }} />
                      {f.title}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section n="02" title="What ran on its own, what didn't" plainTitle="What the computer caught, and what I caught">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-[3px] border-brutal-black bg-white p-4 flex flex-col gap-2">
            <span className={`${label} opacity-55`}>Secret scan</span>
            <span className="font-display font-black text-3xl">{AUDIT_RUN.tools.secretsInCode}</span>
            <p className="font-display text-sm leading-snug text-brutal-black/80">
              <T
                tech={`gitleaks over the cabinet's code, ${AUDIT_RUN.tools.secretScanMs} ms. The leaked key is a plain string in the browser bundle, so a repo scan doesn't flag it.`}
                plain={`A password scanner over the code, under a fifth of a second. It found nothing — the leaked key sits in the page as ordinary text, which it doesn't catch.`}
              />
            </p>
          </div>
          <div className="border-[3px] border-brutal-black bg-white p-4 flex flex-col gap-2">
            <span className={`${label} opacity-55`}>Dependency scan</span>
            <span className="font-display font-black text-3xl">{AUDIT_RUN.tools.depAdvisories}</span>
            <p className="font-display text-sm leading-snug text-brutal-black/80">
              <T
                tech={`osv-scanner, ${AUDIT_RUN.tools.depScanSeconds} s. It flagged 72 known advisories; I updated the libraries, and the ${AUDIT_RUN.tools.depAdvisories} left are dev-only tooling with no clean fix. Real CVEs — re-run it on the repo and you get the same — but not one of these bugs.`}
                plain={`A scanner for out-of-date libraries. It flagged 72; I updated them, and the ${AUDIT_RUN.tools.depAdvisories} left are in developer tools, not the live site. Real, but none of them is one of the problems in this report.`}
              />
            </p>
          </div>
          <div className="border-[3px] border-brutal-black bg-brutal-black text-cream p-4 flex flex-col gap-2">
            <span className={`${label} opacity-60`}>By hand</span>
            <span className="font-display font-black text-3xl text-brutal-yellow">{FINDINGS.length}</span>
            <p className="font-display text-sm leading-snug text-cream/80">
              <T
                tech={`Every ranked finding — all three criticals included — came from reading the code and using the cabinet. Tools found ${AUDIT_RUN.foundByTools} of them.`}
                plain={`All ${FINDINGS.length} problems, including the three worst, came from reading the code and using the cabinet. The tools found ${AUDIT_RUN.foundByTools} of them.`}
              />
            </p>
          </div>
        </div>
        <p className={`${label} opacity-55 mt-4`}>
          gitleaks 8.30.1 · osv-scanner 2.7.0 · run 2026-10-18. Dependency advisories are real; the cabinet&apos;s own bugs are not among them.
        </p>
      </Section>

      <section className="flex flex-col gap-3 border-t-[3px] border-brutal-black pt-6">
        <span className={`${label} opacity-55`}>Next</span>
        <Link href="/lab/audit/after" className="font-display font-black uppercase tracking-[-0.02em] text-xl border-b-[3px] border-brutal-black hover:bg-brutal-yellow w-fit">
          5.3 After the Report →
        </Link>
      </section>
    </AuditShell>
  );
}

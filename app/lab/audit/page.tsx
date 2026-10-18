import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { labMeta } from "@/lib/lab-og";
import LaunchFlow from "@/components/lab/audit/LaunchFlow";
import { getLiveDemo } from "@/lib/lab-config";

export const metadata: Metadata = labMeta(
  "/lab/audit",
  "Launch anyway? — Part 5",
  "One button, one month after launch. What a cabinet built in two weeks costs a design studio, and the audit that turns it into a quiet month."
);

export default function AuditLaunchPage() {
  if (!getLiveDemo("audit")) notFound();
  return (
    <>
      <Navigation />
      <main className="bg-cream bg-grid text-brutal-black pt-20 md:pt-24 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 flex flex-col gap-14 md:gap-20">
          <LaunchFlow />
          <section className="border-t-[3px] border-brutal-black pt-6 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
            <Link href="/lab/audit/report" className="border-b-[3px] border-brutal-black hover:bg-brutal-yellow">
              Read the full report &rarr;
            </Link>
            <a href="/audit-sample-report.pdf" className="border-b-[3px] border-brutal-black hover:bg-brutal-yellow">
              Download it as PDF &darr;
            </a>
            <Link href="/lab" className="border-b-[3px] border-brutal-black hover:bg-brutal-yellow">
              Back to the lab &rarr;
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

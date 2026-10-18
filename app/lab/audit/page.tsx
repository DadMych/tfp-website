import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PartHub from "@/components/lab/PartHub";
import { labDemos } from "@/lib/lab-config";
import { liveChapters } from "@/lib/audit-lab";
import { COUNTS, COVERED, FINDINGS } from "@/lib/audit/findings";

export const dynamic = "force-dynamic";

const audit = labDemos.find((d) => d.slug === "audit")!;

export const metadata: Metadata = labMeta("/lab/audit", `${audit.title.replace(/\.$/, "")} — The Audit`, audit.proves);

export default function AuditLabPage() {
  return (
    <PartHub
      slug="audit"
      base="/lab/audit"
      chapters={liveChapters}
      note={{
        kicker: "Start with the report",
        title: "The report is 5.1.",
        items: [
          `${COUNTS.critical} critical, ${COUNTS.high} high, ${COUNTS.medium} medium, ${COUNTS.low} low`,
          `${COVERED} of ${FINDINGS.length} are taken apart in Parts 1–4`,
          "Every finding reproduces on the broken cabinet",
        ],
        arrow: "left",
      }}
    />
  );
}

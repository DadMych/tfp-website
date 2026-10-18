import LabShell, { type LabDef } from "../LabShell";
import { liveChapters } from "@/lib/audit-lab";

const AUDIT: LabDef = {
  demo: "audit",
  base: "/lab/audit",
  modules: liveChapters,
  done: { href: "/lab", label: "Back to the lab" },
  home: { href: "/lab/audit", label: "Part 5" },
};

/** Frame for every /lab/audit/<chapter> page. */
export default function AuditShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <LabShell lab={AUDIT} slug={slug}>
      {children}
    </LabShell>
  );
}

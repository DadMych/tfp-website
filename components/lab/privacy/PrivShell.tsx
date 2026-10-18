import LabShell, { type LabDef } from "../LabShell";
import { liveChapters } from "@/lib/privacy-lab";
import { getLiveDemo } from "@/lib/lab-config";

/** Frame for every /lab/privacy/<chapter> page. */
export default function PrivShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const audit = getLiveDemo("audit");
  const privacy: LabDef = {
    demo: "privacy",
    base: "/lab/privacy",
    modules: liveChapters,
    done: audit ? { href: audit.href, label: audit.title.replace(/\.$/, ""), kicker: "Next · Part 5" } : { href: "/lab", label: "Back to the lab" },
    home: { href: "/lab/privacy", label: "Part 4" },
  };
  return (
    <LabShell lab={privacy} slug={slug}>
      {children}
    </LabShell>
  );
}

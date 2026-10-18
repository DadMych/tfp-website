import LabShell, { type LabDef } from "../LabShell";
import { liveChapters } from "@/lib/privacy-lab";

const PRIVACY: LabDef = {
  demo: "privacy",
  base: "/lab/privacy",
  modules: liveChapters,
  done: { href: "/lab", label: "Back to the lab" },
  home: { href: "/lab/privacy", label: "Part 4" },
};

/** Frame for every /lab/privacy/<chapter> page. */
export default function PrivShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <LabShell lab={PRIVACY} slug={slug}>
      {children}
    </LabShell>
  );
}

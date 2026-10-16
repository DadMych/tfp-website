import LabShell, { type LabDef } from "../LabShell";
import { liveArticles } from "@/lib/ai-lab";

const AI: LabDef = {
  demo: "ai",
  base: "/lab/ai",
  modules: liveArticles,
  done: { href: "/lab/ai", label: "Back to the lab" },
  home: { href: "/lab/ai", label: "AI Lab" },
};

/** Frame for every /lab/ai/<article> page. */
export default function AiShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <LabShell lab={AI} slug={slug}>
      {children}
    </LabShell>
  );
}

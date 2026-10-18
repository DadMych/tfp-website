import LabShell, { type LabDef } from "../LabShell";
import { liveArticles } from "@/lib/ai-lab";
import { getLiveDemo } from "@/lib/lab-config";

const money = getLiveDemo("money");

const AI: LabDef = {
  demo: "ai",
  base: "/lab/ai",
  modules: liveArticles,
  // TODO(oleksii): confirm "Next: Part 2" over "Back to the lab".
  done: money ? { href: money.href, label: `Part ${money.part}: ${money.title.replace(/\.$/, "")}`, kicker: "Next" } : { href: "/lab/ai", label: "Back to the lab" },
  home: { href: "/lab/ai", label: "Part 1" },
};

/** Frame for every /lab/ai/<article> page. */
export default function AiShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <LabShell lab={AI} slug={slug}>
      {children}
    </LabShell>
  );
}

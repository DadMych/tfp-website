import LabShell, { type LabDef } from "../LabShell";
import { liveChapters } from "@/lib/web3-lab";
import { getLiveDemo } from "@/lib/lab-config";

const privacy = getLiveDemo("privacy");

const WEB3: LabDef = {
  demo: "web3",
  base: "/lab/web3",
  modules: liveChapters,
  done: privacy ? { href: privacy.href, label: `Part ${privacy.part}: ${privacy.title.replace(/\.$/, "")}`, kicker: "Next" } : { href: "/lab", label: "Back to the lab" },
  home: { href: "/lab/web3", label: "Part 3" },
};

/** Frame for every /lab/web3/<chapter> page. */
export default function W3Shell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <LabShell lab={WEB3} slug={slug}>
      {children}
    </LabShell>
  );
}

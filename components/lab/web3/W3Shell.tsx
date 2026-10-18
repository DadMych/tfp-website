import LabShell, { type LabDef } from "../LabShell";
import { liveChapters } from "@/lib/web3-lab";

const WEB3: LabDef = {
  demo: "web3",
  base: "/lab/web3",
  modules: liveChapters,
  done: { href: "/lab", label: "Back to the lab" },
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

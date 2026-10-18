import LabShell, { type LabDef } from "../LabShell";
import { liveModules } from "@/lib/money-lab";
import { getLiveDemo } from "@/lib/lab-config";

const web3 = getLiveDemo("web3");

const MONEY: LabDef = {
  demo: "money",
  base: "/lab/money",
  modules: liveModules,
  home: { href: "/lab/money", label: "Part 2" },
  done: web3 ? { href: web3.href, label: `Part ${web3.part}: ${web3.title.replace(/\.$/, "")}`, kicker: "Next" } : { href: "/lab", label: "Back to the lab" },
};

/** Frame for every /lab/money/<module> page. */
export default function MoneyShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <LabShell lab={MONEY} slug={slug}>
      {children}
    </LabShell>
  );
}

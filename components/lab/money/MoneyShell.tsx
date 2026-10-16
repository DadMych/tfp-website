import LabShell, { type LabDef } from "../LabShell";
import { liveModules } from "@/lib/money-lab";

const MONEY: LabDef = {
  demo: "money",
  base: "/lab/money",
  modules: liveModules,
  done: { href: "/lab/money/games", label: "Back to the games" },
};

/** Frame for every /lab/money/<module> page. */
export default function MoneyShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <LabShell lab={MONEY} slug={slug}>
      {children}
    </LabShell>
  );
}

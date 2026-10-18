import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PartHub from "@/components/lab/PartHub";
import GamesHall from "@/components/lab/money/GamesHall";
import { labDemos } from "@/lib/lab-config";
import { liveModules } from "@/lib/money-lab";

export const dynamic = "force-dynamic";

const money = labDemos.find((d) => d.slug === "money")!;

export const metadata: Metadata = labMeta("/lab/money", `${money.title.replace(/\.$/, "")} — Money Lab`, money.proves);

export default function MoneyLabPage() {
  return (
    <PartHub
      slug="money"
      base="/lab/money"
      chapters={liveModules}
      note={{ kicker: "Keep scrolling", title: "Eight games below.", items: ["The same bugs, as toys", "Break them, then flip the fix"], arrow: "down", href: "#more" }}
    >
      <GamesHall />
    </PartHub>
  );
}

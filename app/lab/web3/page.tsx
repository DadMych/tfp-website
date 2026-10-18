import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PartHub from "@/components/lab/PartHub";
import { labDemos } from "@/lib/lab-config";
import { liveChapters } from "@/lib/web3-lab";

export const dynamic = "force-dynamic";

const web3 = labDemos.find((d) => d.slug === "web3")!;

export const metadata: Metadata = labMeta("/lab/web3", `${web3.title.replace(/\.$/, "")} — Web3 Lab`, web3.proves);

export default function Web3LabPage() {
  return (
    <PartHub
      slug="web3"
      base="/lab/web3"
      chapters={liveChapters}
      note={{ kicker: "Start anywhere", title: "Each chapter stands on its own.", items: ["Read in order for the whole story", "6 tries an hour, shared by all chapters"], arrow: "left" }}
    />
  );
}

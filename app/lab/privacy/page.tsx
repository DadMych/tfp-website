import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PartHub from "@/components/lab/PartHub";
import { labDemos } from "@/lib/lab-config";
import { liveChapters, privacyLimits } from "@/lib/privacy-lab";

export const dynamic = "force-dynamic";

const privacy = labDemos.find((d) => d.slug === "privacy")!;

export const metadata: Metadata = labMeta("/lab/privacy", `${privacy.title.replace(/\.$/, "")} — Privacy Lab`, privacy.proves);

export default function PrivacyLabPage() {
  return (
    <PartHub
      slug="privacy"
      base="/lab/privacy"
      chapters={liveChapters}
      note={{ kicker: "Start anywhere", title: "Each chapter stands on its own.", items: ["Read in order for the whole story", `${privacyLimits.asksPerHour} AI questions an hour, shared by all chapters`], arrow: "left" }}
    />
  );
}

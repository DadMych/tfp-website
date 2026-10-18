import { labOgImage } from "@/lib/lab-og";
import { labDemos } from "@/lib/lab-config";

const d = labDemos.find((x) => x.slug === "audit")!;

export const alt = `${d.title} — The Audit`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab/audit", kicker: `Part ${d.part} · The Audit`, title: d.title, line: d.proves, bg: d.color });
}

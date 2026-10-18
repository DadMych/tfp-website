import { labOgImage } from "@/lib/lab-og";
import { labDemos } from "@/lib/lab-config";

const d = labDemos.find((x) => x.slug === "privacy")!;

export const alt = `${d.title} — Privacy Lab`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab/privacy", kicker: `Part ${d.part} · Privacy Lab`, title: d.title, line: d.proves, bg: d.color });
}

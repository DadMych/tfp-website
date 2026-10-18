import { labOgImage } from "@/lib/lab-og";
import { labDemos } from "@/lib/lab-config";

const d = labDemos.find((x) => x.slug === "money")!;

export const alt = `${d.title} — Money Lab`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab/money", kicker: `Part ${d.part} · Money Lab`, title: d.title, line: d.proves, bg: d.color });
}

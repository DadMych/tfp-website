import { labOgImage } from "@/lib/lab-og";
import { labDemos } from "@/lib/lab-config";

const d = labDemos.find((x) => x.slug === "web3")!;

export const alt = `${d.title} — Web3 Lab`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab/web3", kicker: `Part ${d.part} · Web3 Lab`, title: d.title, line: d.proves, bg: d.color });
}

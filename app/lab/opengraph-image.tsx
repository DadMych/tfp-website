import { labHero } from "@/lib/lab-config";
import { labOgImage } from "@/lib/lab-og";

export const alt = "I made up a company. — Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab", kicker: "tfpdev · Lab · Northwind Studio", title: "I made up a company.", line: labHero, bg: "#C6FF3D" });
}

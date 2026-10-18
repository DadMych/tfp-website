import { labOgImage } from "@/lib/lab-og";

export const alt = "Insights — real decisions from real projects";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({
    path: "/insights",
    kicker: "Writing",
    title: "Insights",
    line: "25 decisions from a real 18-person platform build. No theory — just what we chose, why, and what happened.",
    bg: "#6EC1FF",
  });
}

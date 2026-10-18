import { labOgImage } from "@/lib/lab-og";

export const alt = "Work — case studies with decisions, metrics and code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({
    path: "/work",
    kicker: "Case studies",
    title: "Selected work",
    line: "Eight systems built or rebuilt since 2018. Four with the full story — what broke, what I decided and why, and the proof.",
    bg: "#FFE600",
  });
}

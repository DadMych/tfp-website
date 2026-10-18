import { labOgImage } from "@/lib/lab-og";

export const alt = "10 questions to ask before hiring a technical partner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({
    path: "/free",
    kicker: "Free checklist",
    title: "10 questions before you hire",
    line: "The questions that filter reliable technical partners from the ones who disappear in month two. No email gate.",
    bg: "#C6FF3D",
  });
}

import { labOgImage } from "@/lib/lab-og";

export const alt = "Start a project — tfpdev";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({
    path: "/start",
    kicker: "Start a project",
    title: "What do you need?",
    line: "Three ways to work with me — audit, build, stay on. Then tell me about your project. No pitch decks, no sales calls.",
    bg: "#4ECDC4",
  });
}

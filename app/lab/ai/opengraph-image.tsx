import { labOgImage } from "@/lib/lab-og";

export const alt = "AI Lab — Northwind Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab/ai", kicker: "AI Lab", title: "Northwind Studio", line: "A made-up design studio, three years of its paperwork, and a support bot that answers from it. Open the files, ask the bot, see every step. Then read how each part works.", bg: "#FF5CAA" });
}

import { labOgImage } from "@/lib/lab-og";

export const alt = "Games — Money Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab/money/games", kicker: "Money Lab", title: "Games", line: "Eight ways payment systems lose money, as games. Poke them until they break, then flip the fix.", bg: "#FFE600" });
}

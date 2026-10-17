import { labOgImage } from "@/lib/lab-og";

export const alt = "Articles — Money Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab/money/articles", kicker: "Money Lab", title: "Articles", line: "Race a balance, replay a webhook, refund twice. Each article rebuilds a bug from a real project against Postgres, then shows the version that holds.", bg: "#FF8A3D" });
}

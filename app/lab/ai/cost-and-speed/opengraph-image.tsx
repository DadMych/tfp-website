import { articleCard, labOgImage } from "@/lib/lab-og";

export const alt = "Cost and Speed — AI Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage(articleCard("ai", "cost-and-speed"));
}

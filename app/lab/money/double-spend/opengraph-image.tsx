import { articleCard, labOgImage } from "@/lib/lab-og";

export const alt = "Double-Spend — Money Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage(articleCard("money", "double-spend"));
}

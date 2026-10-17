import { labOgImage } from "@/lib/lab-og";

export const alt = "Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: "/lab", kicker: "tfpdev", title: "Lab", line: "Live demos of the bugs that cost real money in production, and the code that stops them. Money Lab on Postgres, AI Lab on a real model.", bg: "#C6FF3D" });
}

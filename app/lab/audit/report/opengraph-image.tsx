import { labOgImage } from "@/lib/lab-og";
import { auditChapters } from "@/lib/audit-lab";

const m = auditChapters.find((x) => x.slug === "report")!;

export const alt = `${m.title} — The Audit`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: `/lab/audit/${m.slug}`, kicker: m.kicker, title: m.title, line: m.plain ?? m.proves, bg: m.color, ink: m.ink });
}

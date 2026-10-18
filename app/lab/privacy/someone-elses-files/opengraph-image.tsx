import { labOgImage } from "@/lib/lab-og";
import { privacyChapters } from "@/lib/privacy-lab";

const m = privacyChapters.find((x) => x.slug === "someone-elses-files")!;

export const alt = `${m.title} — Privacy Lab`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage({ path: `/lab/privacy/${m.slug}`, kicker: m.kicker, title: m.title, line: m.plain ?? m.proves, bg: m.color, ink: m.ink });
}

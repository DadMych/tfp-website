import type { Hit } from "./search";

/**
 * Ways to blind the answer step to version information, for the Old Versions experiment.
 * Search is unchanged; only what the model reads changes.
 */
export const VARIANTS = ["asis", "nobanner", "nobanner-nolabel", "nobanner-nolabel-norule", "nobanner-current", "nodates"] as const;
export type Variant = (typeof VARIANTS)[number];

const BANNER = /\b(archived|superseded|no longer in force|not in force|replaced (it|on|by)|was replaced|replaces it|retired|do not (quote|send|use))\b/i;

/** Drops every sentence that says a page is old: what a real drive looks like. */
export const stripBanners = (text: string) =>
  text
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .filter((s) => !BANNER.test(s))
        .join(" ")
    )
    .join("\n")
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * "Plans and prices (2025, archived) [ARCHIVED, updated 2025-01-02] › Retainers" → "Plans and prices (2025) › Retainers".
 * The year stays: real file names usually have one.
 */
export const stripLabel = (heading: string) =>
  heading.replace(/\s*\[(ARCHIVED, )?updated [^\]]*\]/, "").replace(/(\(\d{4}(?: version)?), (?:archived|superseded)\)/i, "$1)");

const DATES = /\b(\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)( 20\d\d)?|\d{4}-\d{2}-\d{2}|20[12]\d)\b/g;

/** Also drops every year and date: a drive where nothing says when it was true. */
export const stripDates = (text: string) => text.replace(DATES, "").replace(/\(\s*(version)?\s*\)/g, "").replace(/ {2,}/g, " ");

export function blind(hits: Hit[], v: Variant): Hit[] {
  if (v === "asis") return hits;
  const nolabel = v.includes("nolabel") || v === "nodates";
  const dates = v === "nodates" ? stripDates : (t: string) => t;
  return hits.map((h) => ({
    ...h,
    doc: dates(nolabel ? h.doc.replace(/^old-/, "") : h.doc).replace(/-+$/, ""),
    text: dates(stripBanners(h.text)),
    heading: dates(nolabel ? stripLabel(h.heading) : h.heading),
  }));
}

export const usesRule = (v: Variant) => !v.includes("norule") && v !== "nodates";
export const currentOnly = (v: Variant) => v === "nobanner-current";

/** Text split into kept and removed pieces, for showing what a variant takes away. */
export type Seg = [text: string, cut: boolean];

const cutBy = (segs: Seg[], re: RegExp, whole = false): Seg[] =>
  segs.flatMap(([t, cut]): Seg[] => {
    if (cut) return [[t, true]];
    if (whole) return [...t.matchAll(/[^.!?\n]+[.!?]*\s*|\n/g)].map((m): Seg => [m[0], re.test(m[0])]);
    const out: Seg[] = [];
    let at = 0;
    for (const m of t.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))) {
      if (m.index > at) out.push([t.slice(at, m.index), false]);
      out.push([m[0], true]);
      at = m.index + m[0].length;
    }
    if (at < t.length) out.push([t.slice(at), false]);
    return out;
  });

export function marks(heading: string, text: string, v: Variant): { heading: Seg[]; text: Seg[] } {
  let h: Seg[] = [[heading, false]];
  let b: Seg[] = [[text, false]];
  if (v !== "asis") b = cutBy(b, BANNER, true);
  if (v.includes("nolabel") || v === "nodates") h = cutBy(cutBy(h, /\s*\[(ARCHIVED, )?updated [^\]]*\]/), /, (archived|superseded)(?=\))/i);
  if (v === "nodates") [h, b] = [cutBy(h, DATES), cutBy(b, DATES)];
  return { heading: h, text: b };
}

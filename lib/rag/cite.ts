/**
 * Citation check: does each number in an answer appear in the source it cites?
 * Pure code, no second model. Shared by the page (server) and the live demo (client).
 */

export type ClaimStatus = "backed" | "elsewhere" | "nowhere" | "uncited" | "plain";

export interface Fact {
  value: string;
  /** Cited sources that contain it. */
  inCited: number[];
  /** Other sources that contain it. */
  inOther: number[];
}

export interface Claim {
  text: string;
  cites: number[];
  facts: Fact[];
  status: ClaimStatus;
}

export interface CheckSource {
  n: number;
  heading: string;
  text: string;
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
/** Things worth checking: money, percentages, codes, dates, times, decimals, and numbers of two or more digits. */
const FACT = new RegExp(
  [`\\d{1,2} (?:${MONTHS})(?: \\d{4})?`, "€\\s?\\d[\\d.,]*\\d|€\\s?\\d", "\\d+(?:[.,]\\d+)?\\s?%", "\\bNW-[A-Z]+(?:-[A-Z]+)*\\b", "\\b\\d{1,2}:\\d{2}\\b", "\\b\\d{1,3}(?:[.,]\\d{3})+\\b", "\\b\\d+[.,]\\d+\\b", "\\b\\d{2,}\\b"].join("|"),
  "g"
);

/** "€5,800" and "5.800" and "5800" compare equal; whitespace and case don't matter. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/(\d)[.,\s](?=\d{3}\b)/g, "$1")
    .replace(/€\s?/g, "€")
    .replace(/\s?%/g, "%")
    .replace(/\s+/g, " ");

const contains = (src: CheckSource, value: string) => {
  const hay = norm(`${src.heading} ${src.text}`);
  const v = norm(value);
  const dayMonth = v.match(new RegExp(`^(\\d{1,2} (?:${MONTHS.toLowerCase()})) \\d{4}$`))?.[1];
  return hay.includes(v) || (v.startsWith("€") && hay.includes(v.slice(1))) || (dayMonth != null && hay.includes(dayMonth));
};

export const DECLINE = /^I don['’]t know based on the Northwind documents/i;

export function checkCitations(answer: string, sources: CheckSource[]): Claim[] {
  if (DECLINE.test(answer.trim())) return [];
  return answer
    .split(/(?<=[.!?])\s+(?=[A-Z0-9€"“(])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((sentence): Claim => {
      const cites = [...new Set([...sentence.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))];
      const text = sentence.replace(/\s*\[\d+\]/g, "");
      const values = [...new Set([...text.matchAll(FACT)].map((m) => m[0].trim()))];
      const facts = values.map((value) => ({
        value,
        inCited: sources.filter((s) => cites.includes(s.n) && contains(s, value)).map((s) => s.n),
        inOther: sources.filter((s) => !cites.includes(s.n) && contains(s, value)).map((s) => s.n),
      }));
      const status: ClaimStatus = !facts.length
        ? "plain"
        : !cites.length
          ? "uncited"
          : facts.every((f) => f.inCited.length)
            ? "backed"
            : facts.some((f) => !f.inCited.length && !f.inOther.length)
              ? "nowhere"
              : "elsewhere";
      return { text, cites, facts, status };
    });
}

/** Totals over every fact in an answer. */
export function tally(claims: Claim[]) {
  const facts = claims.flatMap((c) => (c.cites.length ? c.facts : []));
  return {
    facts: facts.length,
    backed: facts.filter((f) => f.inCited.length).length,
    elsewhere: facts.filter((f) => !f.inCited.length && f.inOther.length).length,
    nowhere: facts.filter((f) => !f.inCited.length && !f.inOther.length).length,
    uncited: claims.filter((c) => c.status === "uncited").reduce((n, c) => n + c.facts.length, 0),
  };
}

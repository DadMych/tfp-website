import { FIELDS, PATIENTS, type Field } from "./brief";

export interface Swap {
  placeholder: string;
  value: string;
  field: Field;
}
export interface Exposure {
  patient: number;
  field: Field;
  value: string;
}
export type Segment = { t: string; ph?: string };

const KIND: Record<Field, string> = { name: "PATIENT", dob: "DOB", record: "RECORD", phone: "PHONE", email: "EMAIL", reason: "HEALTH" };
// First match wins: "Date of birth" is a date, not a name.
const COLUMNS: [Field, RegExp][] = [
  ["dob", /birth|\bdob\b/i],
  ["name", /patient|name/i],
  ["record", /record|\bmrn\b|\bid\b/i],
  ["phone", /phone|mobile|\btel/i],
  ["email", /e-?mail/i],
  ["reason", /reason|diagnos|condition|visit/i],
];
const PATTERNS: [Field, RegExp][] = [
  ["email", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g],
  ["dob", /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g],
  ["phone", /\+?\d[\d ()-]{7,}\d/g],
  ["record", /\b[A-Z]{2,4}-\d{4,}\b/g],
];
export const PLACEHOLDER = new RegExp(`\\[?\\b(?:${Object.values(KIND).join("|")})_\\d+\\b\\]?`, "g");

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const whole = (alts: string[], flags = "gu") => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts.map(escape).join("|")})(?![\\p{L}\\p{N}])`, flags);
/** "Pieter van Dijk" → Pieter, Dijk. "Okonkwo-Lindqvist" → Okonkwo, Lindqvist and the whole. */
const nameParts = (name: string) => [...new Set(name.split(/\s+/).flatMap((w) => [w, ...w.split("-")]))].filter((w) => /^\p{Lu}[\p{L}'-]{2,}$/u.test(w) && w !== name);
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/**
 * Swaps personal details for placeholders across all parts, numbered consistently.
 * Finds them by table header and by pattern; a name found in a table is also swapped
 * wherever it appears on its own ("Marta's card"). Nothing here knows the lab's patients.
 */
export function redact(parts: string[]): { parts: string[]; swaps: Swap[] } {
  const swaps: Swap[] = [];
  const byValue = new Map<string, string>();
  const next: Partial<Record<Field, number>> = {};
  const add = (field: Field, value: string, n?: number) => {
    if (!value || byValue.has(value)) return;
    const num = n ?? (next[field] ?? 1);
    next[field] = Math.max(next[field] ?? 1, num + 1);
    const placeholder = `[${KIND[field]}_${num}]`;
    swaps.push({ placeholder, value, field });
    byValue.set(value, placeholder);
    if (field === "name") for (const p of nameParts(value)) if (!byValue.has(p)) byValue.set(p, placeholder);
  };

  for (const text of parts) {
    const lines = text.split("\n");
    for (let i = 0; i + 1 < lines.length; i++) {
      if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
      const kinds = cells(lines[i]).map((h) => COLUMNS.find(([, re]) => re.test(h))?.[0]);
      for (let r = i + 2, row = 1; r < lines.length && /^\s*\|/.test(lines[r]); r++, row++)
        cells(lines[r]).forEach((c, j) => kinds[j] && add(kinds[j], c, row));
    }
  }
  for (const text of parts) for (const [field, re] of PATTERNS) for (const m of text.matchAll(re)) add(field, m[0].trim());

  if (byValue.size === 0) return { parts, swaps };
  const values = [...byValue.keys()].sort((a, b) => b.length - a.length);
  const re = whole(values);
  return { parts: parts.map((t) => t.replace(re, (m) => byValue.get(m) ?? m)), swaps };
}

/** Puts the real values back for the person reading. Placeholders the model made up stay as they are. */
export function rehydrate(text: string, swaps: Swap[]): { segments: Segment[]; unresolved: string[] } {
  const map = new Map(swaps.map((s) => [s.placeholder, s.value]));
  const segments: Segment[] = [];
  const unresolved: string[] = [];
  let at = 0;
  for (const m of text.matchAll(PLACEHOLDER)) {
    const ph = `[${m[0].replace(/^\[|\]$/g, "")}]`;
    const value = map.get(ph);
    if (!value) {
      unresolved.push(ph);
      continue;
    }
    segments.push({ t: text.slice(at, m.index) }, { t: value, ph });
    at = m.index + m[0].length;
  }
  segments.push({ t: text.slice(at) });
  return { segments: segments.filter((s) => s.t), unresolved };
}

/** Every lab patient detail, for highlighting. Split on it: odd parts are details. */
export const DETAILS = new RegExp(`(${whole(PATIENTS.flatMap((p) => FIELDS.flatMap((f) => (f === "name" ? [p.name, ...nameParts(p.name)] : [p[f]]))).sort((a, b) => b.length - a.length)).source})`, "giu");

const probes = PATIENTS.map((p) => FIELDS.map((f) => ({ field: f, re: whole(f === "name" ? [p.name, ...nameParts(p.name)] : [p[f]], "iu") })));

/** The grader: which of the lab patients' real details appear in `text`. Knows the answers; the redactor doesn't. */
export function exposed(text: string): Exposure[] {
  return probes.flatMap((fs, patient) =>
    fs.flatMap(({ field, re }) => {
      const m = text.match(re);
      return m ? [{ patient, field, value: m[0] }] : [];
    })
  );
}

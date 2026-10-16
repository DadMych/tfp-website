// Checks generated Northwind documents against their briefs and the canon:
// front matter matches the brief, every `must` string is present, and every
// € amount or percentage also appears in the canon or a brief.
//
//   node scripts/rag-check.mjs [--only=slug,slug]

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { SPECS } from "../content/northwind-specs.mjs";

const root = join(process.cwd(), "content");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const canon = await readFile(join(root, "northwind-canon.md"), "utf8");
const AMOUNT = /€\s?\d[\d.,]*|\d+(?:[.,]\d+)?\s?%/g;
const norm = (s) => s.replace(/[\s.,]/g, "").replace(/0+%$/, (z) => z);
const allowed = new Set((canon + SPECS.map((s) => s.brief + s.must.join(" ")).join(" ")).match(AMOUNT).map(norm));
const files = new Set(await readdir(join(root, "northwind")));

let bad = 0;
for (const s of SPECS) {
  if (only && !only.includes(s.slug)) continue;
  const problems = [];
  if (!files.has(`${s.slug}.md`)) problems.push("file missing");
  else {
    const raw = await readFile(join(root, "northwind", `${s.slug}.md`), "utf8");
    const m = raw.match(/^---\ntitle: (.*)\nupdated: (.*)\nstatus: (.*)\n---\n\n# /);
    if (!m) problems.push("front matter must be exactly title/updated/status, then a blank line, then '# Title'");
    else if (m[1] !== s.title || m[2] !== s.updated || m[3] !== s.status) problems.push(`front matter differs from brief (want title "${s.title}", updated ${s.updated}, status ${s.status})`);
    for (const must of s.must) if (!raw.includes(must)) problems.push(`missing ${JSON.stringify(must)}`);
    const unknown = [...new Set((raw.match(AMOUNT) ?? []).filter((a) => !allowed.has(norm(a))))];
    if (unknown.length) problems.push(`amounts not in canon or brief (fine only if computed from them): ${unknown.join("  ")}`);
  }
  if (problems.length) {
    bad++;
    console.log(`✗ ${s.slug}\n    ${problems.join("\n    ")}`);
  }
}
console.log(bad ? `\n${bad} document(s) need attention` : "all documents pass");

"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { type FullDoc, errorText, loadDoc } from "./rag-client";

const DOCS: { slug: string; tech: string; plain: string; terms: string[] }[] = [
  { slug: "pricing-2026", tech: "Price list 2026", plain: "This year's prices", terms: ["€5,800", "NW-SPR-B", "10%"] },
  { slug: "pricing-2025", tech: "Price list 2025 (archived)", plain: "Last year's prices", terms: ["€5,200", "15%"] },
  { slug: "ref-rate-card", tech: "Rate card", plain: "Rate card", terms: ["€150", "€1,200"] },
  { slug: "contract-terms", tech: "Contract terms", plain: "Contract terms", terms: ["30 days", "next month only"] },
  { slug: "mail-kestrel-invoice", tech: "Client email", plain: "An email thread", terms: ["reverse charge", "€11,200"] },
  { slug: "de-leistungen", tech: "German services page", plain: "A file in German", terms: ["5.800", "Eilauftrag"] },
];

const FIXED = 400;
const STEP = 350;
const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const isWord = (c: string | undefined) => Boolean(c && /[\p{L}\p{N}]/u.test(c));

function Marked({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="bg-brutal-black text-brutal-yellow px-0.5">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export default function ChunkingDemo() {
  const { plain } = useExplain();
  const [slug, setSlug] = useState(DOCS[0].slug);
  const [term, setTerm] = useState(DOCS[0].terms[0]);
  const [doc, setDoc] = useState<FullDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadDoc(slug).then(
      (d) => live && (setDoc(d), setError(null)),
      (e) => live && setError(errorText(e))
    );
    return () => {
      live = false;
    };
  }, [slug]);

  const view = useMemo(() => {
    if (!doc || doc.slug !== slug) return null;
    const flat = doc.body.replace(/\s+/g, " ");
    const year = doc.updated.slice(0, 4);
    const fixed = doc.chunks.fixed.map((c) => {
      const start = c.ord * STEP;
      const end = Math.min(flat.length, start + FIXED);
      const cut = (isWord(flat[start - 1]) && isWord(flat[start])) || (isWord(flat[end - 1]) && isWord(flat[end]));
      return { ...c, cut, overlap: c.ord === 0 ? 0 : FIXED - STEP };
    });
    const t = term.trim().toLowerCase();
    const has = (s: string) => Boolean(t) && s.toLowerCase().includes(t);
    const fHit = fixed.filter((c) => has(c.text));
    const sHit = doc.chunks.section.filter((c) => has(c.text) || has(c.heading));
    return {
      fixed,
      fHit,
      sHit,
      named: fHit.filter((c) => c.text.includes(doc.title) || c.text.includes(year)).map((c) => c.ord + 1),
      avg: (xs: { tokens: number }[]) => Math.round(xs.reduce((s, x) => s + x.tokens, 0) / Math.max(1, xs.length)),
      avgWords: (xs: { text: string }[]) => Math.round(xs.reduce((s, x) => s + words(x.text), 0) / Math.max(1, xs.length)),
    };
  }, [doc, slug, term]);

  const pick = DOCS.find((d) => d.slug === slug)!;
  const chip = (on: boolean) => `shrink-0 h-9 px-3 border-2 border-brutal-black font-display font-bold text-sm transition-colors ${on ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`;

  const nums = (xs: number[]) => xs.join(", ");
  const fLine = (() => {
    if (!view || !term.trim()) return "";
    if (view.fHit.length === 0) return plain ? `\u201c${term}\u201d isn't in any piece whole. It was cut in two.` : `\u201c${term}\u201d: no piece holds it whole. The window split it.`;
    const all = view.fHit.map((c) => c.ord + 1);
    const bare = all.filter((n) => !view.named.includes(n));
    const where = `${all.length === 1 ? "Piece" : "Pieces"} ${nums(all)}.`;
    if (!bare.length) return `${where} ${plain ? "It says which file it's from." : "File name or year inside the window."}`;
    if (bare.length === all.length) return `${where} ${plain ? "Nothing in it says which file, or which year." : "No file name, no year: the model can't tell 2025 from 2026."}`;
    return `${where} ${plain ? `Piece ${nums(bare)} doesn't say which file it's from.` : `Piece ${nums(bare)} has no file name and no year.`}`;
  })();
  const sLine = !view || !term.trim() ? "" : view.sHit.length === 0 ? (plain ? "Not in this file." : "No section contains it.") : plain ? `In \u201c${view.sHit[0].heading.split(" › ").pop()}\u201d, labelled with the file's name and date.` : `Section \u201c${view.sHit[0].heading.split(" › ").pop()}\u201d, carrying \u201c${view.sHit[0].heading.split(" › ")[0]}\u201d.`;

  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className={`${label} opacity-60`}>
            <T tech="Document" plain="Pick a file" />
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DOCS.map((d) => (
              <button
                key={d.slug}
                type="button"
                className={chip(slug === d.slug)}
                onClick={() => {
                  setSlug(d.slug);
                  setTerm(d.terms[0]);
                }}
              >
                {plain ? d.plain : d.tech}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex flex-col gap-2 flex-1 min-w-0">
            <span className={`${label} opacity-60`}>
              <T tech="Find a fact in the pieces" plain="Look for a fact" />
            </span>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              maxLength={40}
              className="h-11 px-3.5 border-[3px] border-brutal-black bg-cream font-mono text-sm focus:outline-none focus:bg-white"
            />
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {pick.terms.map((t) => (
              <button key={t} type="button" onClick={() => setTerm(t)} className={`h-11 px-3 border-2 border-dashed border-brutal-black font-mono text-xs font-bold transition-colors ${term === t ? "bg-brutal-yellow border-solid" : "bg-white hover:bg-brutal-yellow"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </Stage>

      {error && <p className="font-display font-bold text-[#D4006A]">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fixed windows */}
        <div className="flex flex-col border-[3px] border-brutal-black bg-white text-brutal-black shadow-[8px_8px_0_0_#000] min-w-0">
          <div className="px-4 py-3 border-b-[3px] border-brutal-black bg-[#FFF0F7] flex flex-col gap-1">
            <span className="flex items-center justify-between gap-2">
              <span className="font-display font-black uppercase tracking-[-0.02em] text-lg leading-none">
                <T tech="Every 400 characters" plain="Equal pieces" />
              </span>
              <span className={`${label} opacity-60 tabular-nums`}>{view ? (plain ? `${view.fixed.length} pieces · about ${view.avgWords(view.fixed)} words` : `${view.fixed.length} · ~${view.avg(view.fixed)} tok`) : "…"}</span>
            </span>
            <span className="font-mono text-[11px] leading-snug h-[2lh] overflow-hidden">{fLine}</span>
          </div>
          <ol className="h-[30rem] overflow-y-auto p-3 flex flex-col gap-2 bg-cream">
            {view?.fixed.map((c) => {
              const hit = view.fHit.includes(c);
              return (
                <li key={c.id} className={`border-2 border-brutal-black bg-white transition-shadow ${hit ? "shadow-[4px_4px_0_0_#000] outline outline-2 outline-brutal-black" : ""}`}>
                  <div className="flex items-center justify-between gap-2 px-2.5 h-7 border-b-2 border-brutal-black/15">
                    <span className={`${label} !tracking-[0.1em]`}>
                      {plain ? "Piece" : "Chunk"} {c.ord + 1}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {c.cut && <span className={`${label} !tracking-[0.06em] px-1 bg-[#FF5CAA] border border-brutal-black`}>{plain ? "cut mid-word" : "split mid-word"}</span>}
                      <span className="font-mono text-[10px] opacity-50 tabular-nums">{plain ? `${words(c.text)} words` : `${c.tokens} tok`}</span>
                    </span>
                  </div>
                  <p className="px-2.5 py-2 font-mono text-[11.5px] leading-relaxed break-words">
                    {c.overlap > 0 && (
                      <span className="opacity-40" title={plain ? "Repeated from the previous piece" : "Overlap with the previous chunk"}>
                        <Marked text={c.text.slice(0, c.overlap)} term={term} />
                      </span>
                    )}
                    <Marked text={c.text.slice(c.overlap)} term={term} />
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Sections */}
        <div className="flex flex-col border-[3px] border-brutal-black bg-white text-brutal-black shadow-[8px_8px_0_0_#000] min-w-0">
          <div className="px-4 py-3 border-b-[3px] border-brutal-black bg-[#F6FFE6] flex flex-col gap-1">
            <span className="flex items-center justify-between gap-2">
              <span className="font-display font-black uppercase tracking-[-0.02em] text-lg leading-none">
                <T tech="One per section" plain="By section" />
              </span>
              <span className={`${label} opacity-60 tabular-nums`}>{view && doc ? (plain ? `${doc.chunks.section.length} pieces · about ${view.avgWords(doc.chunks.section)} words` : `${doc.chunks.section.length} · ~${view.avg(doc.chunks.section)} tok`) : "…"}</span>
            </span>
            <span className="font-mono text-[11px] leading-snug h-[2lh] overflow-hidden">{sLine}</span>
          </div>
          <ol className="h-[30rem] overflow-y-auto p-3 flex flex-col gap-2 bg-cream">
            {view &&
              doc?.chunks.section.map((c) => {
                const hit = view.sHit.includes(c);
                return (
                  <li key={c.id} className={`border-2 border-brutal-black bg-white ${hit ? "shadow-[4px_4px_0_0_#000] outline outline-2 outline-brutal-black" : ""}`}>
                    <div className="px-2.5 py-1.5 bg-brutal-black text-cream font-mono text-[10.5px] leading-snug">
                      <Marked text={c.heading} term={term} />
                    </div>
                    <p className="px-2.5 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words">
                      <Marked text={c.text} term={term} />
                    </p>
                    <div className="px-2.5 pb-1.5 font-mono text-[10px] opacity-50 tabular-nums text-right">{plain ? `${words(c.text)} words` : `${c.tokens} tok`}</div>
                  </li>
                );
              })}
          </ol>
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="These are the stored chunks the bot searches, straight from the database. Grey text at the start of a window repeats the end of the previous one (50 characters of overlap)."
          plain="These are the real pieces the bot searches. Grey text at the start of a piece is repeated from the one before, so nothing falls in the gap."
        />
      </p>
    </div>
  );
}

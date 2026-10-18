"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExplainToggle } from "./money/Explain";

export interface BarChapter {
  href: string;
  title: string;
}

/** Sticky strip under the site nav: which Part, which chapter, every other chapter one click away. */
export default function PartBar({ part, title, home, chapters, current }: { part: number; title: string; home: string; chapters: BarChapter[]; current: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const n = (j: number) => `${part}.${j + 1}`;
  const prev = chapters[current - 1];
  const next = chapters[current + 1];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const arrow = "flex items-center justify-center w-9 h-9 border-[3px] border-brutal-black font-mono text-sm font-bold";

  return (
    <div ref={ref} className="sticky top-16 z-40 bg-cream border-b-[3px] border-brutal-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3 lg:gap-6">
        <Link href={home} className="hidden lg:inline font-mono text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap hover:underline underline-offset-4">
          Part {part}
          <span className="hidden xl:inline"> · {title}</span>
        </Link>

        <ol className="hidden lg:flex items-center gap-1.5">
          {chapters.map((c, j) => (
            <li key={c.href} className="relative group">
              <Link
                href={c.href}
                aria-label={`${n(j)} ${c.title}`}
                aria-current={j === current ? "page" : undefined}
                className={`flex items-center justify-center w-8 h-8 border-[2px] border-brutal-black font-mono text-[11px] font-bold transition-colors ${j === current ? "bg-brutal-black text-cream" : "bg-white hover:bg-brutal-yellow"}`}
              >
                {j + 1}
              </Link>
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block whitespace-nowrap bg-brutal-black text-cream px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
                {n(j)} {c.title}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="lg:hidden flex-1 min-w-0 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-left"
        >
          <span className="flex-shrink-0 bg-brutal-black text-cream px-1.5 py-0.5">{n(current)}</span>
          <span className="truncate">{chapters[current].title}</span>
          <span aria-hidden="true" className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <ExplainToggle compact />
          {prev ? (
            <Link href={prev.href} aria-label={`Previous: ${prev.title}`} className={`${arrow} hidden sm:flex bg-white hover:bg-brutal-yellow`}>
              ←
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrow} hidden sm:flex opacity-25`}>
              ←
            </span>
          )}
          {next ? (
            <Link href={next.href} aria-label={`Next: ${next.title}`} className={`${arrow} hidden sm:flex bg-white hover:bg-brutal-yellow`}>
              →
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrow} hidden sm:flex opacity-25`}>
              →
            </span>
          )}
        </div>
      </div>

      {open && (
        <nav aria-label={`Part ${part} chapters`} className="lg:hidden absolute left-0 right-0 top-full bg-cream border-b-[3px] border-brutal-black max-h-[70vh] overflow-y-auto">
          <ol className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col">
            {chapters.map((c, j) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={() => setOpen(false)}
                  aria-current={j === current ? "page" : undefined}
                  className={`flex items-center gap-3 py-3 border-b-[2px] border-brutal-black/10 font-display font-bold text-lg uppercase tracking-[-0.02em] ${j === current ? "" : "hover:bg-brutal-yellow"}`}
                >
                  <span className={`font-mono text-[11px] px-1.5 py-0.5 border-[2px] border-brutal-black ${j === current ? "bg-brutal-black text-cream" : "bg-white"}`}>{n(j)}</span>
                  {c.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href={home} onClick={() => setOpen(false)} className="block py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:underline underline-offset-4">
                Part {part} · {title} →
              </Link>
            </li>
          </ol>
        </nav>
      )}
    </div>
  );
}

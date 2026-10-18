"use client";

import { useState } from "react";
import Link from "next/link";
import { useExplain } from "@/components/lab/money/Explain";
import ShowMe from "./ShowMe";
import { bySeverity, SEVERITY, type Finding, type Severity } from "@/lib/audit/findings";

const ORDER: Severity[] = ["critical", "high", "medium", "low"];
const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

function FindingCard({ f }: { f: Finding }) {
  const { plain } = useExplain();
  const [open, setOpen] = useState(false);
  const sev = SEVERITY[f.severity];
  const isChapter = f.show.kind === "chapter";

  return (
    <article className="border-[3px] border-brutal-black bg-white shadow-[6px_6px_0_0_#000]">
      <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-brutal-black px-4 py-2.5" style={{ background: sev.bg, color: sev.ink }}>
        <span className={`${label} px-2 py-0.5 border-2 border-current`}>{sev.label}</span>
        <h3 className="font-display font-black uppercase tracking-[-0.02em] text-lg md:text-xl leading-none flex-1 min-w-0">{f.title}</h3>
        {f.chapter && (
          <span className={`${label} px-1.5 py-0.5 bg-brutal-black text-cream`}>{f.chapter.n}</span>
        )}
      </div>

      <div className="p-4 md:p-5 flex flex-col gap-4">
        <p className="font-display text-base md:text-lg leading-snug">{plain ? f.whatPlain : f.whatTech}</p>

        <div className="flex flex-col gap-1 border-l-[4px] border-brutal-black pl-3">
          <span className={`${label} opacity-55`}>What it means for Northwind</span>
          <p className="font-display text-[15px] leading-snug text-brutal-black/85">{f.soWhat}</p>
        </div>

        {isChapter ? (
          <Link
            href={f.show.kind === "chapter" ? f.show.href : "#"}
            className="w-fit inline-flex items-center gap-2 h-10 px-4 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase text-sm shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-[transform,box-shadow]"
          >
            Show me <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <div className="flex flex-col gap-3">
            {!open ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-fit inline-flex items-center gap-2 h-10 px-4 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase text-sm shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-[transform,box-shadow]"
              >
                Show me <span aria-hidden="true">↓</span>
              </button>
            ) : (
              <ShowMe show={f.show} />
            )}
          </div>
        )}

        <div className="flex flex-col gap-1 border-t-[2px] border-dashed border-brutal-black/25 pt-3">
          <span className={`${label} opacity-55`}>The fix</span>
          <p className="font-display text-[15px] leading-snug">{f.fix}</p>
          {f.chapter && (
            <Link href={f.chapter.href} className="w-fit mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] border-b-2 border-brutal-black hover:bg-brutal-yellow">
              {f.chapter.n} {f.chapter.label} →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FindingsList() {
  return (
    <div className="flex flex-col gap-10">
      {ORDER.map((s) => {
        const items = bySeverity(s);
        if (items.length === 0) return null;
        const sev = SEVERITY[s];
        return (
          <section key={s} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-block size-4 border-2 border-brutal-black" style={{ background: sev.bg }} />
              <h2 className="font-display font-black uppercase tracking-[-0.03em] text-2xl md:text-3xl">{sev.label}</h2>
              <span className={`${label} opacity-55`}>{items.length}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {items.map((f) => (
                <FindingCard key={f.id} f={f} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { BUILD_LABEL, FIELD_LABEL } from "./extract-meta";

export interface Miss {
  title: string;
  got: string;
  key: string;
  grade: string;
  quote: string | null;
  proof: string | null;
}
export interface Column {
  build: string;
  records: number;
  perfect: number;
  misses: Record<string, Miss[]>;
}

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const shade = (n: number) => (n === 0 ? "#C6FF3D" : n < 5 ? "#FFE600" : "#FF5CAA");

export default function ExtractGrid({ fields, columns, initial }: { fields: string[]; columns: Column[]; initial: [string, string] }) {
  const { plain } = useExplain();
  const [[f, b], setCell] = useState(initial);
  const misses = columns.find((c) => c.build === b)?.misses[f] ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
      <div className="min-w-0 overflow-x-auto border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black">
        <table className="w-full min-w-[26rem] border-collapse">
          <thead>
            <tr className="bg-cream border-b-[3px] border-brutal-black">
              <th className={`${label} text-left px-3 h-14`}>
                <T tech={`Wrong, of ${columns[0]?.records ?? 0}`} plain={`Mistakes, of ${columns[0]?.records ?? 0}`} />
              </th>
              {columns.map((c) => (
                <th key={c.build} className="font-display font-bold text-[12.5px] leading-tight px-1.5 h-14 text-center">
                  {plain ? BUILD_LABEL[c.build].plain : BUILD_LABEL[c.build].tech}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((x) => (
              <tr key={x} className="border-b-2 border-brutal-black/15">
                <th className={`text-left px-3 h-11 ${plain ? "font-display text-[13px] font-bold" : "font-mono text-[11.5px] font-bold"}`}>{plain ? FIELD_LABEL[x].plain : FIELD_LABEL[x].tech}</th>
                {columns.map((c) => {
                  const n = c.misses[x]?.length ?? 0;
                  const on = f === x && b === c.build;
                  return (
                    <td key={c.build} className="p-1">
                      <button type="button" onClick={() => setCell([x, c.build])} aria-pressed={on} aria-label={`${x}, ${BUILD_LABEL[c.build].tech}: ${n} wrong`} className={`w-full h-9 border-2 border-brutal-black font-mono text-[12px] font-bold tabular-nums ${on ? "outline outline-[3px] outline-brutal-black shadow-[3px_3px_0_0_#000]" : "hover:brightness-95"}`} style={{ background: shade(n) }}>
                        {n}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-cream">
              <th className={`${label} text-left px-3 h-12`}>
                <T tech="Records all right" plain="Fully right" />
              </th>
              {columns.map((c) => (
                <td key={c.build} className="text-center font-mono text-[13px] font-bold tabular-nums">
                  {c.perfect}/{c.records}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col h-[28rem] min-w-0">
        <div className="shrink-0 h-[4.5rem] px-4 flex flex-col justify-center gap-1 border-b-[3px] border-brutal-black bg-cream">
          <span className="font-display font-bold text-[14px] leading-tight">
            {plain ? FIELD_LABEL[f].plain : FIELD_LABEL[f].tech} · {plain ? BUILD_LABEL[b].plain : BUILD_LABEL[b].tech}
          </span>
          <span className="font-mono text-[10.5px] leading-snug opacity-70 line-clamp-2">{plain ? BUILD_LABEL[b].whatPlain : BUILD_LABEL[b].what}</span>
        </div>
        <ol className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 bg-cream">
          {misses.length === 0 && <li className="m-auto font-display text-base opacity-70">{plain ? "No mistakes here." : `Right in all ${columns.find((c) => c.build === b)?.records ?? 0} runs.`}</li>}
          {misses.map((m, i) => (
            <li key={i} className="border-2 border-brutal-black bg-white">
              <div className="px-2.5 h-8 flex items-center border-b-2 border-brutal-black/15 font-display text-[12.5px] font-bold truncate">{m.title}</div>
              <dl className="px-2.5 py-2 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 font-mono text-[11.5px]">
                <dt className="opacity-60">{plain ? "it wrote" : "got"}</dt>
                <dd className="break-words">
                  <span className="px-1 border border-brutal-black" style={{ background: m.grade === "format" ? "#FFE600" : "#FF5CAA" }}>
                    {m.got}
                  </span>
                </dd>
                <dt className="opacity-60">{plain ? "right" : "key"}</dt>
                <dd className="break-words">{m.key}</dd>
                {m.quote && (
                  <>
                    <dt className="opacity-60">{plain ? "proof" : "quote"}</dt>
                    <dd className="break-words">
                      &ldquo;{m.quote}&rdquo; <span className="font-bold">{m.proof === "verified" ? (plain ? "· checks out" : "· verified") : plain ? "· flagged" : "· flagged"}</span>
                    </dd>
                  </>
                )}
              </dl>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

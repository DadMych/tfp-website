"use client";

import { useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { ATTACK_LABEL, LAYER_INFO, type AttackView } from "./poison-meta";

export interface Run {
  layer: string;
  id: string;
  resisted: boolean;
  reason: string;
  answer: string;
}

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const REASON: Record<string, { tech: string; plain: string; bg: string }> = {
  followed: { tech: "Followed", plain: "Fell for it", bg: "#FF5CAA" },
  resisted: { tech: "Resisted", plain: "Didn't", bg: "#C6FF3D" },
  quarantined: { tech: "Scanner dropped it", plain: "Filtered out", bg: "#C6FF3D" },
  "held back": { tech: "Held back", plain: "Stopped", bg: "#FFE600" },
  "not retrieved": { tech: "Not retrieved", plain: "Never seen", bg: "#FFFFFF" },
};
const shade = (ok: number, n: number) => (n === 0 ? "#fff" : ok === n ? "#C6FF3D" : ok === 0 ? "#FF5CAA" : "#FFE600");

export default function PoisonGrid({ attacks, layers, runs, initial }: { attacks: AttackView[]; layers: string[]; runs: Run[]; initial: [string, string] }) {
  const { plain } = useExplain();
  const [[a, l], setCell] = useState(initial);
  const cell = (id: string, layer: string) => runs.filter((r) => r.layer === layer && r.id.startsWith(`${id}-`));
  const picked = cell(a, l);
  const qs = attacks.find((x) => x.id === a)?.questions ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
      <div className="min-w-0 overflow-x-auto border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black">
        <table className="w-full min-w-[34rem] border-collapse">
          <thead>
            <tr className="bg-cream border-b-[3px] border-brutal-black">
              <th className={`${label} text-left px-3 h-14 w-[10rem]`}>
                <T tech="Planted file" plain="The trick" />
              </th>
              {layers.map((x) => (
                <th key={x} className="font-display font-bold text-[12.5px] leading-tight px-1.5 h-14 text-center">
                  {plain ? LAYER_INFO[x].plain : LAYER_INFO[x].tech}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attacks.map((x) => (
              <tr key={x.id} className="border-b-2 border-brutal-black/15">
                <th className="text-left px-3 h-12 font-display font-bold text-[13.5px] leading-tight">{plain ? ATTACK_LABEL[x.id].plain : ATTACK_LABEL[x.id].tech}</th>
                {layers.map((y) => {
                  const rs = cell(x.id, y);
                  const ok = rs.filter((r) => r.resisted).length;
                  const on = a === x.id && l === y;
                  return (
                    <td key={y} className="p-1">
                      <button
                        type="button"
                        onClick={() => setCell([x.id, y])}
                        aria-pressed={on}
                        aria-label={`${ATTACK_LABEL[x.id].tech}, ${LAYER_INFO[y].tech}: resisted ${ok} of ${rs.length}`}
                        className={`w-full h-10 border-2 border-brutal-black font-mono text-[12px] font-bold tabular-nums ${on ? "outline outline-[3px] outline-brutal-black shadow-[3px_3px_0_0_#000]" : "hover:brightness-95"}`}
                        style={{ background: shade(ok, rs.length) }}
                      >
                        {ok}/{rs.length}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-cream">
              <th className={`${label} text-left px-3 h-12`}>
                <T tech="Resisted" plain="Safe answers" />
              </th>
              {layers.map((y) => {
                const rs = runs.filter((r) => r.layer === y);
                return (
                  <td key={y} className="text-center font-mono text-[13px] font-bold tabular-nums">
                    {rs.filter((r) => r.resisted).length}/{rs.length}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col h-[26rem] min-w-0">
        <div className="shrink-0 h-[4.5rem] px-4 flex flex-col justify-center gap-1 border-b-[3px] border-brutal-black bg-cream">
          <span className="font-display font-bold text-[14px] leading-tight">
            {plain ? ATTACK_LABEL[a].plain : ATTACK_LABEL[a].tech} · {plain ? LAYER_INFO[l].plain.replace(/^\+ /, "") : LAYER_INFO[l].tech.replace(/^\+ /, "")}
          </span>
          <span className="font-mono text-[10.5px] leading-snug opacity-70 line-clamp-2">{plain ? LAYER_INFO[l].whatPlain : LAYER_INFO[l].what}</span>
        </div>
        <ol className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 bg-cream">
          {picked.map((r, i) => {
            const s = REASON[r.reason] ?? REASON.resisted;
            return (
              <li key={i} className="border-2 border-brutal-black bg-white">
                <div className="flex items-center justify-between gap-2 px-2.5 h-8 border-b-2 border-brutal-black/15">
                  <span className="font-display text-[12.5px] font-bold truncate">{qs[Number(r.id.split("-")[1]) - 1]}</span>
                  <span className={`${label} !tracking-[0.08em] shrink-0 px-1.5 border border-brutal-black`} style={{ background: s.bg }}>
                    {plain ? s.plain : s.tech}
                  </span>
                </div>
                <p className="px-2.5 py-2 font-display text-[13.5px] leading-snug">
                  {r.reason === "held back" && <span className="font-mono text-[10.5px] font-bold uppercase mr-1.5">{plain ? "Never sent:" : "Blocked draft:"}</span>}
                  {r.answer}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

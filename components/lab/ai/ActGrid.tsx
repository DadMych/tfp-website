"use client";

import { useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import type { ActRun } from "@/lib/ai/act";
import type { Side } from "@/lib/ai/scenarios";
import { ACT_LABEL, ACT_ORDER } from "./act-meta";

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const SIDES: Side[] = ["careless", "guarded"];
const SIDE_LABEL = { careless: { tech: "No guards", plain: "Careless app" }, guarded: { tech: "Every guard on", plain: "Careful app" } } as const;
const pill = { broke: "bg-[#FF5CAA]", stopped: "bg-[#C6FF3D]", clean: "bg-white", budget: "bg-white" } as const;
const PILL = { broke: "broke", stopped: "stopped", clean: "clean", budget: "budget" } as const;
const PLAIN_PILL = { broke: "went wrong", stopped: "caught", clean: "nothing to catch", budget: "out of budget" } as const;
const shade = (broke: number) => (broke === 0 ? "#C6FF3D" : broke < 5 ? "#FFE600" : "#FF5CAA");

function sentLine(r: ActRun): string {
  if (r.sent.length === 0) return "nothing";
  const by = new Map<string, number>();
  for (const m of r.sent) {
    const who = m.to.split("@")[0] || "(no address)";
    by.set(who, (by.get(who) ?? 0) + 1);
  }
  const broken = r.sent.filter((m) => m.empty).length;
  return [...by].map(([w, n]) => (n > 1 ? `${w} ×${n}` : w)).join(", ") + (broken ? ` · ${broken} empty` : "");
}

export default function ActGrid({ runs }: { runs: ActRun[] }) {
  const { plain } = useExplain();
  const [[s, side], setCell] = useState<[string, Side]>(["tidy", "careless"]);
  const picked = runs.filter((r) => r.scenario === s && r.side === side);
  const of = (sc: string, sd: Side) => runs.filter((r) => r.scenario === sc && r.side === sd);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
      <div className="min-w-0 overflow-x-auto border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-cream border-b-[3px] border-brutal-black">
              <th className={`${label} text-left px-3 h-14`}>
                <T tech="Broke, of runs" plain="Went wrong" />
              </th>
              {SIDES.map((sd) => (
                <th key={sd} className="font-display font-bold text-[12.5px] leading-tight px-1.5 h-14 text-center w-[30%]">
                  {plain ? SIDE_LABEL[sd].plain : SIDE_LABEL[sd].tech}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACT_ORDER.map((sc) => (
              <tr key={sc} className="border-b-2 border-brutal-black/15">
                <th className="text-left px-3 h-14 font-display text-[13px] font-bold leading-tight">{plain ? ACT_LABEL[sc].plain : ACT_LABEL[sc].tech}</th>
                {SIDES.map((sd) => {
                  const rs = of(sc, sd);
                  const broke = rs.filter((r) => r.outcome === "broke").length;
                  const on = s === sc && side === sd;
                  return (
                    <td key={sd} className="p-1">
                      <button
                        type="button"
                        onClick={() => setCell([sc, sd])}
                        aria-pressed={on}
                        aria-label={`${ACT_LABEL[sc].tech}, ${SIDE_LABEL[sd].tech}: ${broke} of ${rs.length} broke`}
                        className={`w-full h-11 border-2 border-brutal-black font-mono text-[13px] font-bold tabular-nums ${on ? "outline outline-[3px] outline-brutal-black shadow-[3px_3px_0_0_#000]" : "hover:brightness-95"}`}
                        style={{ background: shade(broke) }}
                      >
                        {broke}/{rs.length}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-3 py-3 text-[12.5px] leading-snug text-brutal-black/70">
          <T tech={`Broke = ${ACT_LABEL[s].broke}. Judged from the database, not from what the model said.`} plain={`Went wrong = ${ACT_LABEL[s].plainBroke}. Checked in the database, not taken from the AI's word.`} />
        </p>
      </div>

      <div className="min-w-0 flex flex-col h-[30rem]">
        <div className="flex items-center justify-between gap-3 px-4 h-12 shrink-0 border-b-[3px] border-brutal-black bg-cream">
          <span className="font-display font-bold text-[14px] truncate">
            {plain ? ACT_LABEL[s].plain : ACT_LABEL[s].tech} · {plain ? SIDE_LABEL[side].plain : SIDE_LABEL[side].tech}
          </span>
          <span className={`${label} shrink-0`}>{picked.length} runs</span>
        </div>
        <ol className="flex-1 overflow-y-auto divide-y-2 divide-brutal-black/10">
          {picked.map((r, i) => (
            <li key={i} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold tabular-nums text-brutal-black/50 w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className={`${label} border-2 border-brutal-black px-1.5 py-0.5 ${pill[r.outcome]}`}>{plain ? PLAIN_PILL[r.outcome] : PILL[r.outcome]}</span>
                <span className="font-mono text-[11px] text-brutal-black/60 ml-auto">
                  <T tech={`${r.steps} turns`} plain={`${r.steps} steps`} />
                </span>
              </div>
              <dl className="mt-1.5 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[12.5px] leading-snug">
                <dt className="font-bold">
                  <T tech="Delivered" plain="Sent" />
                </dt>
                <dd className="font-mono text-[12px] truncate">{sentLine(r)}</dd>
                {r.held.length > 0 && (
                  <>
                    <dt className="font-bold">
                      <T tech="Held" plain="Waiting" />
                    </dt>
                    <dd className="font-mono text-[12px] truncate">{r.held.join(", ")}</dd>
                  </>
                )}
                {r.deleted > 0 && (
                  <>
                    <dt className="font-bold">Deleted</dt>
                    <dd className="font-mono text-[12px]">{r.deleted} contacts</dd>
                  </>
                )}
              </dl>
              {r.report && <p className="mt-1.5 text-[12.5px] leading-snug text-brutal-black/75 line-clamp-2">{r.report}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

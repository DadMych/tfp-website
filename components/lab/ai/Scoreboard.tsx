import { T } from "@/components/lab/money/Explain";
import type { ConfigScore } from "@/lib/rag/scores";

/** The pipelines graded on answers, from the usual first build to the careful one. */
export const LADDER = [
  "fixed/keyword/norerank/all",
  "fixed/vector/norerank/all",
  "section/vector/norerank/all",
  "section/hybrid/norerank/all",
  "section/hybrid/rerank/all",
  "section/hybrid/rerank/current",
];

export function configLabel(key: string, plain: boolean) {
  const [chunks, search, rerank, scope] = key.split("/");
  const parts = plain
    ? [chunks === "fixed" ? "Equal pieces" : "Sections", { keyword: "words", vector: "meaning", hybrid: "both" }[search], rerank === "rerank" && "second look", scope === "current" && "skip old"]
    : [chunks === "fixed" ? "400-char chunks" : "Sections", search, rerank === "rerank" && "rerank", scope === "current" && "current only"];
  return parts.filter(Boolean).join(" · ");
}

function Bar({ value, tone }: { value: number; tone: "good" | "bad" | "neutral" }) {
  return (
    <div className="relative h-6 border-[3px] border-brutal-black bg-white">
      <div className={`absolute inset-y-0 left-0 ${tone === "good" ? "bg-[#C6FF3D]" : tone === "bad" ? "bg-[#FF5CAA]" : "bg-brutal-yellow"}`} style={{ width: `${value * 100}%` }} />
      <span className="absolute inset-0 flex items-center justify-end pr-2 font-mono text-[11px] font-bold tabular-nums">{Math.round(value * 100)}%</span>
    </div>
  );
}

export default function Scoreboard({ scores }: { scores: ConfigScore[] }) {
  const rows = LADDER.flatMap((k) => scores.filter((s) => s.config === k && s.answers != null));
  if (!rows.length) return null;
  return (
    <div className="border-[3px] border-brutal-black bg-white text-brutal-black shadow-[8px_8px_0_0_#000] p-5 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-black uppercase tracking-[-0.03em] text-xl md:text-2xl leading-none">
          <T tech="Same model, same prompt, six pipelines" plain="Same AI, six ways to find the pages" />
        </h3>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] opacity-60">{rows[0].questions} questions with an answer key</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
        <span className="hidden sm:block" />
        <span>
          <T tech="Retrieval: evidence in top 5" plain="Found the right piece" />
        </span>
        <span>
          <T tech="Answers right" plain="Answered right" />
        </span>
      </div>
      {rows.map((s, i) => (
        <div key={s.config} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-1.5 items-center">
          <span className="col-span-2 sm:col-span-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] leading-tight">
            <T tech={configLabel(s.config, false)} plain={configLabel(s.config, true)} />
          </span>
          <Bar value={s.retrieval} tone="neutral" />
          <Bar value={s.answers!} tone={i === 0 ? "bad" : s.answers === 1 ? "good" : "neutral"} />
        </div>
      ))}
    </div>
  );
}

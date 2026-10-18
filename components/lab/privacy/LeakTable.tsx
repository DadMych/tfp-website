import { T } from "@/components/lab/money/Explain";
import { CLIENTS } from "@/lib/privacy/access";
import type { PrivQuestion } from "@/lib/privacy/questions";
import type { PrivRun } from "@/lib/privacy/runs";

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

function Cells({ runs }: { runs: PrivRun[] }) {
  return (
    <span className="flex gap-1">
      {runs.map((r, i) => (
        <span key={i} title={r.reason} className="size-5 border-2 border-brutal-black" style={{ background: r.clean ? "#C6FF3D" : "#FF5CAA" }} />
      ))}
    </span>
  );
}

/** Every stored question with its runs; open a row to read one answer from each build. */
export default function LeakTable({ questions, runs }: { questions: PrivQuestion[]; runs: PrivRun[] }) {
  return (
    <div className="border-[3px] border-brutal-black bg-white">
      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-4 px-4 h-10 items-center border-b-[3px] border-brutal-black bg-cream">
        <span className={label}>
          <T tech="Logged in as · question" plain="Who asks · what" />
        </span>
        <span className={label}>Careless</span>
        <span className={label}>Careful</span>
      </div>
      {questions.map((q) => {
        const careless = runs.filter((r) => r.id === q.id && r.build === "careless");
        const careful = runs.filter((r) => r.id === q.id && r.build === "careful");
        const leak = careless.find((r) => !r.clean) ?? careless[0];
        return (
          <details key={q.id} className="group border-b-2 border-brutal-black/15 last:border-b-0">
            <summary className="cursor-pointer list-none grid grid-cols-[minmax(0,1fr)_auto_auto] md:grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 md:gap-4 px-4 py-2.5 items-center hover:bg-cream">
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className={`${label} opacity-60`}>
                  {CLIENTS[q.as]} · {q.kind === "foreign" ? <T tech="answer is in someone else's file" plain="answer belongs to someone else" /> : <T tech="own or public matter" plain="their own business" />}
                </span>
                <span className="font-display text-[15px] leading-snug">{q.q}</span>
              </span>
              <Cells runs={careless} />
              <Cells runs={careful} />
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 pb-4">
              {[
                { name: "Careless", r: leak, bg: "#FFD1E8" },
                { name: "Careful", r: careful[0], bg: "#EEFFC2" },
              ].map(
                ({ name, r, bg }) =>
                  r && (
                    <div key={name} className="border-2 border-brutal-black p-3 flex flex-col gap-1.5" style={{ background: bg }}>
                      <span className={label}>
                        {name} · {r.reason}
                      </span>
                      <p className="font-display text-[14px] leading-snug">{r.answer}</p>
                    </div>
                  )
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

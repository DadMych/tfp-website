"use client";

import { useEffect, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import { STEPS, TTL_MINUTES, type Links, type Opened, type Step, type Tried } from "@/lib/privacy/link-steps";
import { errorText } from "@/components/lab/ai/rag-client";

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const PINK = "#FF5CAA";
const GREEN = "#C6FF3D";

function Result({ o }: { o: Opened }) {
  const ok = o.status === 200;
  return (
    <span className="flex items-start gap-2 min-w-0">
      <span className={`${label} !tracking-[0.06em] shrink-0 px-1.5 py-0.5 border-2 border-brutal-black`} style={{ background: ok ? "#FFE600" : "#fff" }}>
        {o.status}
      </span>
      <span className="font-display text-[14px] leading-snug min-w-0">
        {ok && <b className="mr-1">{o.file}.</b>}
        {o.why}
      </span>
    </span>
  );
}

export default function LinkDemo() {
  const session = useLabSession();
  const { plain } = useExplain();
  const [links, setLinks] = useState<Links | null>(null);
  const [tries, setTries] = useState<(Tried & { label: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    labPost<Links>("/api/lab/privacy/links", session, { action: "share" })
      .then(setLinks)
      .catch((e) => setError(errorText(e)));
  }, [session]);

  const run = async (body: Record<string, unknown>, name: string) => {
    if (busy || !session || !links) return;
    setBusy(true);
    setError(null);
    try {
      const r = await labPost<Tried>("/api/lab/privacy/links", session, { ...body, links });
      setLinks(r.links);
      setTries((t) => [...t, { ...r, label: name }]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const restart = async () => {
    if (busy || !session) return;
    setBusy(true);
    try {
      setLinks(await labPost<Links>("/api/lab/privacy/links", session, { action: "share" }));
      setTries([]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const done = new Set(tries.map((t) => t.step));
  const input = "w-full min-w-0 h-11 px-3 border-[3px] border-brutal-black bg-cream font-mono text-[11.5px] focus:outline-none focus:bg-white";

  return (
    <div className="flex flex-col gap-5">
      <Stage className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5">
        <div className="flex flex-col gap-3 min-w-0">
          <span className={label}>{plain ? "A message from the project" : "Harbor · Verdant Energy · Website Sprint 2026"}</span>
          <div className="border-[3px] border-brutal-black bg-white px-4 py-3 flex flex-col gap-3">
            <p className="font-display text-[15px] leading-snug">
              <b>Vlas Koerbatski</b> {plain ? "to the freelancer:" : "→ the freelancer:"} “Here&apos;s the proposal, have a look before Thursday.”
            </p>
            <label className="flex flex-col gap-1">
              <span className={label} style={{ color: "#D4006A" }}>
                <T tech="Plain link · anyone · forever" plain="Plain link: works for anyone, forever" />
              </span>
              <input className={input} value={links?.careless ?? "…"} onChange={(e) => links && setLinks({ ...links, careless: e.target.value })} spellCheck={false} aria-label="Plain link" />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label} style={{ color: "#3D7A00" }}>
                <T tech={`Signed link · ${TTL_MINUTES} minutes · the freelancer only`} plain={`Signed link: ${TTL_MINUTES} minutes, only the freelancer`} />
              </span>
              <input className={input} value={links?.careful ?? "…"} onChange={(e) => links && setLinks({ ...links, careful: e.target.value })} spellCheck={false} aria-label="Signed link" />
            </label>
            <div className="flex items-center gap-4 flex-wrap">
              <button type="button" disabled={busy || !links} onClick={() => run({ action: "open" }, plain ? "Opened what's in the boxes" : "Opened as typed")} className="h-11 px-4 border-[3px] border-brutal-black bg-white font-display font-bold text-[14px] disabled:opacity-40">
                {plain ? "Open both as the freelancer" : "Open both as typed"}
              </button>
              <span className="font-mono text-[11px] opacity-60">{plain ? "Change a character in either link first, if you like." : "Edit either link first, if you like."}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <span className={label}>{plain ? "What happens next" : "Five things that happen to links"}</span>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              disabled={busy || !links}
              onClick={() => run({ action: "step", step: s.id as Step }, plain ? s.plain : s.tech)}
              className={`text-left min-h-11 px-3 py-2 border-[3px] border-brutal-black font-display text-[14px] leading-snug flex items-center gap-3 disabled:opacity-40 ${done.has(s.id) ? "bg-cream" : "bg-white hover:bg-brutal-yellow"}`}
            >
              <span className="font-mono text-[11px] font-bold">{i + 1}</span>
              {plain ? s.plain : s.tech}
              {s.id === "later" && <span className="ml-auto font-mono text-[10px] opacity-60">{plain ? "clock moved" : "simulated clock"}</span>}
            </button>
          ))}
          <div className="flex items-center gap-4 mt-1">
            <button type="button" disabled={busy || !session} onClick={restart} className="font-mono text-[11px] font-bold underline underline-offset-4 disabled:opacity-40">
              {plain ? "Start over" : "Reset · share again"}
            </button>
            {error && <span className="font-mono text-[11px] text-[#D4006A]">{error}</span>}
          </div>
        </div>
      </Stage>

      <div className="border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] grid grid-cols-1 lg:grid-cols-2">
        {(["careless", "careful"] as const).map((b, i) => (
          <div key={b} className={`min-w-0 flex flex-col ${i === 0 ? "border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black" : ""}`}>
            <div className="min-h-12 px-4 py-2 flex items-center border-b-[3px] border-brutal-black" style={{ background: b === "careful" ? GREEN : PINK }}>
              <span className={label}>{b === "careful" ? <T tech="Checks at the click" plain="Checks every time it's clicked" /> : <T tech="The address is the key" plain="Whoever has it, gets in" />}</span>
            </div>
            {tries.length === 0 ? (
              <p className="p-4 font-mono text-[11px] opacity-50">{plain ? "Press a step to see what happens." : "Run a step."}</p>
            ) : (
              <ol className="flex flex-col">
                {tries.map((t, j) => (
                  <li key={j} className="px-4 py-2.5 border-b-2 border-brutal-black/10 last:border-b-0 flex flex-col gap-1">
                    <span className={label}>{t.label}</span>
                    <Result o={t[b]} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="Real: the HMAC-SHA256 signature, the expiry check, the share row in Postgres that revoking updates, and Harbor's file table. Simulated: step 3 asks the same check with the clock 11 minutes ahead instead of making you wait. Each share is yours alone."
          plain="Real: the signature, the time limit and the database check. Simulated: step 3 moves the clock instead of making you wait 11 minutes."
        />
      </p>
    </div>
  );
}

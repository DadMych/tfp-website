"use client";

import { useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import { CLIENTS, type ClientId } from "@/lib/privacy/access";
import type { Portal } from "@/lib/privacy/harbor";
import { PERSONAS } from "@/lib/privacy/questions";
import { errorText } from "@/components/lab/ai/rag-client";

interface Result {
  careless: Portal;
  ownerKey: Portal;
  careful: Portal;
  remaining: number;
}

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const short = (id: string) => (id in CLIENTS ? CLIENTS[id as ClientId].split(" ")[0] : id);
const of = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);
const size = (kb: number) => (kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`);

const PORTALS = [
  { key: "careless", bg: "#FF5CAA", tech: "Checks you're logged in", plain: "Only checks you're logged in" },
  { key: "ownerKey", bg: "#FF8A3D", tech: "Row security on, owner's key", plain: "Database rule on, master key" },
  { key: "careful", bg: "#C6FF3D", tech: "Checks it's yours, as the client", plain: "Checks it's yours, twice" },
] as const;

function Card({ p, as, def }: { p: Portal | null; as: ClientId; def: (typeof PORTALS)[number] }) {
  const { plain } = useExplain();
  const foreign = p ? p.files.filter((f) => f.client !== as).length : 0;
  return (
    <div className="flex flex-col min-w-0">
      <div className="min-h-12 px-4 py-2 flex items-center justify-between gap-2 border-b-[3px] border-brutal-black" style={{ background: def.bg }}>
        <span className={label}>{plain ? def.plain : def.tech}</span>
        {p && (
          <span className={`${label} !tracking-[0.08em] shrink-0 px-1.5 py-0.5 border-2 border-brutal-black bg-white`}>
            {p.status === 404 ? "404" : p.owner !== as ? (plain ? `${of(short(p.owner ?? ""))} files` : `200 · ${foreign} not yours`) : plain ? "Your files" : "200 · yours"}
          </span>
        )}
      </div>
      <ul className="flex flex-col">
        {Array.from({ length: 3 }, (_, i) => p?.files[i]).map((f, i) => (
          <li key={i} className="h-11 px-4 flex items-center gap-2.5 border-b border-brutal-black/10 min-w-0" style={f && f.client !== as ? { background: "#FFD1E8" } : undefined}>
            {f ? (
              <>
                <span className="font-mono text-[10px] font-bold w-8 shrink-0 uppercase">{f.name.split(".").pop()}</span>
                <span className="font-display text-[14px] truncate flex-1">{f.name}</span>
                <span className="font-mono text-[10.5px] opacity-60 shrink-0">{size(f.size_kb)}</span>
              </>
            ) : i === 0 && p ? (
              <span className="font-mono text-[12px] font-bold">{p.status === 404 ? (plain ? "Page not found" : "404 · Not found") : plain ? "No files in this project" : "200 · no files"}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-auto border-t-[3px] border-brutal-black bg-cream px-4 py-2.5 flex flex-col gap-1 font-mono text-[11px] leading-snug min-h-[4.25rem]">
        {p && (
          <>
            <span>
              <T tech={`Query ran as ${p.role} · skips row security: ${p.bypass ? "yes" : "no"}`} plain={p.bypass ? "Database asked with a master key" : "Database asked as this client"} />
            </span>
            {p.dbOnly !== undefined && (
              <span className="font-bold">
                <T tech={`Without the app check, the database returned ${p.dbOnly} rows`} plain={`Even without the first check, the database gave ${p.dbOnly} files`} />
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function HarborDemo({ home }: { home: Record<string, number> }) {
  const session = useLabSession();
  const { plain } = useExplain();
  const [as, setAs] = useState<ClientId>("brightlane");
  const [num, setNum] = useState(String(home.brightlane));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ as: ClientId; project: number; r: Result } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (n = num) => {
    const project = Number(n);
    if (busy || !Number.isInteger(project) || project < 1) return;
    setBusy(true);
    setError(null);
    try {
      setRes({ as, project, r: await labPost<Result>("/api/lab/privacy/harbor", session, { as, project }) });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const step = (d: number) => {
    const n = String((Number(num) || home[as]) + d);
    setNum(n);
    open(n);
  };
  const choose = (id: ClientId) => {
    setAs(id);
    setNum(String(home[id]));
    setRes(null);
    setError(null);
  };

  const shown = res && res.as === as ? res : null;
  const btn = "h-10 px-3 border-[3px] border-brutal-black font-display font-bold bg-white hover:bg-cream disabled:opacity-50";

  return (
    <div className="flex flex-col gap-5">
      <Stage className="flex flex-col gap-4">
        <span className={label}>
          <T tech="Logged in to Harbor as" plain="You're logged in as" />
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Logged in as">
          {PERSONAS.map((id) => (
            <button key={id} type="button" onClick={() => choose(id)} aria-pressed={as === id} className={`shrink-0 h-10 px-3 border-[3px] border-brutal-black font-display font-bold text-sm ${as === id ? "bg-brutal-black text-cream" : "bg-white hover:bg-cream"}`}>
              {CLIENTS[id]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[16rem] h-12 flex items-center border-[3px] border-brutal-black bg-white font-mono text-[13px] sm:text-[14px] px-3 overflow-hidden">
              <span className="opacity-50 hidden sm:inline">harbor.northwind.example</span>
              <span className="opacity-50">/projects/</span>
              <input
                value={num}
                onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && open()}
                inputMode="numeric"
                aria-label="Project number in the address"
                className="w-[5.5ch] font-bold bg-brutal-yellow border-b-2 border-brutal-black px-0.5 focus:outline-none"
              />
              <span className="opacity-50">/files</span>
            </div>
            <button type="button" onClick={() => step(-1)} disabled={busy} aria-label="Previous project number" className={btn}>
              −1
            </button>
            <button type="button" onClick={() => step(1)} disabled={busy} aria-label="Next project number" className={btn}>
              +1
            </button>
            <button type="button" onClick={() => open()} disabled={busy} className="h-12 px-5 border-[3px] border-brutal-black bg-brutal-yellow font-display font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60">
              {busy ? "…" : "Open"}
            </button>
          </div>
          <span className={`${label} opacity-60`}>
            {shown ? (
              `${shown.r.remaining} ${plain ? "opens left this hour" : "opens left this hour"}`
            ) : (
              <T tech={`${of(short(as))} project is ${home[as]}. Open it, then try the numbers next to it.`} plain={`${of(short(as))} project is number ${home[as]}. Open it, then change the number by one.`} />
            )}
          </span>
        </div>
      </Stage>

      <div className="border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000]">
        <div className="min-h-12 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-between gap-1 sm:gap-3 border-b-[3px] border-brutal-black bg-cream">
          <span className={label}>
            <T tech={shown ? `GET /projects/${shown.project}/files` : "Three portals, one address"} plain={shown ? `Project ${shown.project}` : "Three portals, one address"} />
          </span>
          <span className="font-mono text-[11.5px] font-bold">
            {error ? (
              <span className="text-[#D4006A]">{error}</span>
            ) : busy ? (
              plain ? "Opening…" : "Running three queries…"
            ) : !shown ? (
              "\u00a0"
            ) : !shown.r.careless.owner ? (
              plain ? "No project with that number" : "No such project"
            ) : shown.r.careless.owner !== as ? (
              plain ? `That's ${of(CLIENTS[shown.r.careless.owner as ClientId])} project, not ${of(short(as))}` : `Belongs to ${CLIENTS[shown.r.careless.owner as ClientId]}`
            ) : (
              plain ? `${of(short(as))} own project` : "Your own project"
            )}
          </span>
        </div>
        <div className={`grid grid-cols-1 lg:grid-cols-3 transition-opacity ${busy && shown ? "opacity-40" : ""}`}>
          {PORTALS.map((def, i) => (
            <div key={def.key} className={`flex min-w-0 ${i < 2 ? "border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black" : ""}`}>
              <Card p={shown?.r[def.key] ?? null} as={as} def={def} />
            </div>
          ))}
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="Real: a Postgres database with a row-level security policy and a separate client role; every click runs the queries. Simulated: the login and the portal around them. The files are names in a table, not documents."
          plain="Real: the database, its rules and every lookup. Pretend: the login and the portal. The files are just names, not real documents."
        />
      </p>
    </div>
  );
}

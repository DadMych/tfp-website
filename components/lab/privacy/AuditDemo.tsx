"use client";

import { useEffect, useState } from "react";
import { T, useExplain } from "@/components/lab/money/Explain";
import { Stage } from "@/components/lab/money/ui";
import { labPost, useLabSession } from "@/lib/lab/client";
import type { Check, Entry, LogState, Receipt } from "@/lib/privacy/audit";
import { errorText } from "@/components/lab/ai/rag-client";

type Reply = { state: LogState; app?: string; read?: boolean; remaining?: number };
type Note = { careless: string; careful: string[] } | null;

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const PINK = "#FF5CAA";
const GREEN = "#C6FF3D";
const BOT = "Northwind bot";
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Amsterdam", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const short = (h?: string) => (h ? h.slice(0, 8) : "");

function verdict(check: Check, receiptSeq: number, plain: boolean): string {
  if (check.ok) return plain ? "Nothing changed since it was written." : `Chain intact. Entry ${receiptSeq} matches the hash Tidepool got on 1 Oct.`;
  if (check.why === "missing") return plain ? `Something was removed before entry ${check.seq}.` : `Broken at entry ${check.seq}: it points to an entry that isn't there any more.`;
  if (check.why === "changed") return plain ? `Entry ${check.seq} was changed after it was written.` : `Broken at entry ${check.seq}: it was changed after it was written.`;
  return plain
    ? "The list looks fine, but it doesn't match what Tidepool was sent on 1 Oct. Someone rewrote September."
    : `Every link checks out, but entry ${check.seq} no longer matches the hash Tidepool got on 1 Oct. September was rewritten.`;
}

function Rows({ rows, careful, check, receipt }: { rows: Entry[]; careful: boolean; check?: Check; receipt: Receipt }) {
  const { plain } = useExplain();
  const bad = check && !check.ok && check.why !== "receipt" ? check.seq : null;
  return (
    <ol className="flex flex-col">
      {rows.map((r, i) => (
        <li
          key={`${r.seq}-${i}`}
          className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 px-4 py-2 border-b-2 border-brutal-black/10 last:border-b-0"
          style={{ background: r.seq === bad ? "#FFD1E8" : r.at > receipt.sentAt ? "#FFFBEA" : undefined }}
        >
          <span className="font-mono text-[11px] leading-snug opacity-70">{when(r.at)}</span>
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="font-display text-[14px] leading-snug">
              {r.actor === BOT && <span className={`${label} !tracking-[0.06em] mr-1.5 px-1 border-2 border-brutal-black bg-brutal-yellow`}>bot</span>}
              <b>{r.actor}</b> {r.action} {r.detail}
            </span>
            {careful && (
              <span className="font-mono text-[10.5px] opacity-60 truncate">
                #{r.seq} · {plain ? "seal" : "hash"} {short(r.hash)} · {plain ? "after" : "prev"} {short(r.prev)}
                {r.hash === receipt.hash && (plain ? " · sent to Tidepool" : " · in Tidepool's 1 Oct report")}
                {r.at > receipt.sentAt && (plain ? " · after the report" : " · after the last report")}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function AuditDemo() {
  const session = useLabSession();
  const { plain } = useExplain();
  const [s, setS] = useState<LogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [botNote, setBotNote] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const call = async (body: Record<string, string>, after?: (r: Reply) => void) => {
    if (busy || !session) return;
    setBusy(true);
    setError(null);
    try {
      const r = await labPost<Reply>("/api/lab/privacy/audit", session, body);
      setS(r.state);
      after?.(r);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    labPost<Reply>("/api/lab/privacy/audit", session, { action: "reset" })
      .then((r) => setS(r.state))
      .catch((e) => setError(errorText(e)));
  }, [session]);

  const tampered = s ? !s.careless.some((r) => r.actor === "Vlas Koerbatski") : false;
  const hide = (kind: "delete" | "delete-rehash") =>
    call({ action: "tamper", kind }, (r) =>
      setNote({
        careless: plain ? "Deleted. Nothing shows it was ever there." : "Owner key: deleted and renumbered. No trace.",
        careful: [`${plain ? "As the app" : "As the app (audit_writer)"}: ${r.app}`, kind === "delete" ? "With the owner key: deleted." : plain ? "With the owner key: deleted, and every seal after it redone." : "With the owner key: deleted, renumbered and re-hashed."],
      })
    );
  const btn = "text-left min-h-11 px-3 py-2 border-[3px] border-brutal-black font-display text-[14px] leading-snug disabled:opacity-40";

  return (
    <div className="flex flex-col gap-5">
      <Stage className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3 min-w-0">
          <span className={label}>{plain ? "The contract" : "Harbor · Tidepool Payments · the contract"}</span>
          <div className="border-[3px] border-brutal-black bg-white px-4 py-3 flex flex-col gap-0.5">
            <span className="font-display font-bold text-[15px]">Proposal: Tidepool Payments Partner retainer</span>
            <span className="font-mono text-[11px] opacity-60">{plain ? "Signed March 2026. Confidential." : "proposal-tidepool · signed March 2026 · confidentiality clause"}</span>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" disabled={busy || !s} onClick={() => call({ action: "open" })} className={`${btn} bg-white hover:bg-cream`}>
              {plain ? "Open it as Tomás" : "Open it as Tomás (on the Tidepool team)"}
            </button>
            <button
              type="button"
              disabled={busy || !s}
              onClick={() =>
                call({ action: "bot" }, (r) => {
                  setRemaining(r.remaining ?? null);
                  setBotNote(r.read ? (plain ? "The bot read the contract to answer." : "The search pulled the contract into the answer.") : plain ? "This time the bot didn't need the contract." : "This time the contract wasn't in the top 5.");
                })
              }
              className={`${btn} bg-white hover:bg-cream`}
            >
              {plain ? "Let Atlas HR ask the bot about Tidepool" : "Atlas HR asks the bot: “What exactly does Tidepool get on their Partner retainer?”"}
            </button>
            {botNote && <span className="font-mono text-[11px] opacity-70">{botNote}</span>}
          </div>
          <span className={`${label} mt-2`}>{plain ? "Someone with full access to the database" : "Someone with the database owner key"}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" disabled={busy || !s || tampered} onClick={() => hide("delete")} className={`${btn} bg-brutal-black text-cream`}>
              Delete Vlas&apos;s download
            </button>
            <button type="button" disabled={busy || !s || tampered} onClick={() => hide("delete-rehash")} className={`${btn} bg-brutal-black text-cream`}>
              {plain ? "Delete it and redo every seal after it" : "Delete it and re-hash everything after"}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={busy || !s}
              onClick={() =>
                call({ action: "reset" }, () => {
                  setNote(null);
                  setBotNote(null);
                })
              }
              className="font-mono text-[11px] font-bold underline underline-offset-4 disabled:opacity-40"
            >
              {plain ? "Start over" : "Reset"}
            </button>
            <span className={`${label} opacity-60`}>{error ? <span className="text-[#D4006A] normal-case tracking-normal">{error}</span> : remaining != null ? `${remaining} ${plain ? "bot questions left this hour" : "AI questions left this hour"}` : "\u00a0"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <span className={label}>{plain ? "The client asks" : "Email from Tidepool Payments, 2 October"}</span>
          <div className="border-[3px] border-brutal-black bg-white px-4 py-3 font-display text-[15px] leading-snug">
            {plain
              ? "Who opened our contract in September? Include anything automated."
              : "Who opened our contract in September? We need the full list for our own audit, including anything automated that read it."}
          </div>
          <span className={label}>{plain ? "What Tidepool already has" : "Receipt Tidepool already holds"}</span>
          <div className="border-[3px] border-brutal-black bg-brutal-black text-cream px-4 py-3 font-mono text-[11px] leading-relaxed">
            {s ? (
              <>
                <span className="block font-bold uppercase tracking-[0.15em] text-[10px] mb-1">{plain ? "September report, sent 1 Oct" : "Monthly access report · 1 Oct"}</span>
                {plain ? `It ended with seal ${short(s.receipt.hash)} on entry ${s.receipt.seq}. That copy is in Tidepool's inbox, out of our reach.` : `Last entry: #${s.receipt.seq} · hash ${short(s.receipt.hash)}… Stored in Tidepool's inbox, not in our database.`}
              </>
            ) : (
              "…"
            )}
          </div>
          <p className="font-mono text-[11px] leading-relaxed opacity-70">
            <T
              tech="Try it in order: open the contract, let the bot read it, then hide Vlas's download both ways. Each log is your own copy."
              plain="Open the contract, let the bot read it, then try to hide an entry. Each log here is your own copy."
            />
          </p>
        </div>
      </Stage>

      <div className="border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] grid grid-cols-1 lg:grid-cols-2">
        {(["careless", "careful"] as const).map((b, i) => {
          const careful = b === "careful";
          const rows = s?.[b] ?? [];
          return (
            <div key={b} className={`min-w-0 flex flex-col ${i === 0 ? "border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-brutal-black" : ""}`}>
              <div className="min-h-12 px-4 py-2 flex items-center border-b-[3px] border-brutal-black" style={{ background: careful ? GREEN : PINK }}>
                <span className={label}>{careful ? <T tech="Every read, bot included · chained · append-only" plain="Every read, sealed in a chain" /> : <T tech="People opening it · editable" plain="Only people, and it can be edited" />}</span>
              </div>
              {s && (
                <div className="px-4 py-2.5 border-b-[3px] border-brutal-black flex flex-col gap-1 font-mono text-[11px] leading-snug" style={{ background: careful ? (s.check.ok ? "#EEFFC2" : "#FFD1E8") : "#fff" }}>
                  <span className="font-bold">
                    {careful
                      ? verdict(s.check, s.receipt.seq, plain)
                      : plain
                        ? `${rows.length} entries. No way to tell if anything is missing.`
                        : `${rows.length} entries · nothing to check them against.`}
                  </span>
                  {note && (careful ? note.careful : [note.careless]).map((l) => <span key={l}>{l}</span>)}
                </div>
              )}
              {s ? <Rows rows={rows} careful={careful} check={careful ? s.check : undefined} receipt={s.receipt} /> : <p className="p-4 font-mono text-[11px] opacity-50">…</p>}
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-3xl">
        <T
          tech="Real: both logs in Postgres, the app's role that may only insert, the owner key that may do anything, SHA-256, and the bot's search. September is written for the lab; what you do is added live. The receipt would really live with Tidepool; here it's a row we promise not to touch."
          plain="Real: the two logs, the database rules, the seals and the bot. September is made up for the lab; what you click is added for real. In real life Tidepool keeps the receipt, not us."
        />
      </p>
    </div>
  );
}

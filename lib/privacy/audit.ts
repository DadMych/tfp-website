import { createHash } from "node:crypto";
import { sql, withTx } from "@/lib/db";
import { search } from "@/lib/rag/search";
import { CAREFUL } from "@/lib/rag/presets";
import { QUESTIONS } from "./questions";

export const CONTRACT = "proposal-tidepool";
export const GENESIS = "0".repeat(64);
export const BOT = "Northwind bot";
export const TARGET = "Vlas Koerbatski";
const BOT_QUESTION = QUESTIONS.find((q) => q.id === "partner")!;

// Lab copy: September as it was logged. The careless log never wrote the bot's reads.
const SEPTEMBER = [
  { at: "2026-09-02T09:14:00+02:00", actor: "Sandra Tsapljoek", action: "opened", detail: "in Harbor" },
  { at: "2026-09-03T11:40:00+02:00", actor: "Tomás Pereira", action: "opened", detail: "in Harbor" },
  { at: "2026-09-08T14:05:00+02:00", actor: BOT, action: "read", detail: "to answer Sandra: “When does Tidepool's retainer renew?”" },
  { at: "2026-09-11T16:22:00+02:00", actor: "Sofie Milkova", action: "downloaded", detail: "for the NDA review" },
  { at: "2026-09-17T10:31:00+02:00", actor: BOT, action: "read", detail: "to answer Brightlane: “Have you redesigned onboarding for a fintech before?”" },
  { at: "2026-09-19T23:47:00+02:00", actor: TARGET, action: "downloaded", detail: "in Harbor" },
  { at: "2026-09-24T09:02:00+02:00", actor: BOT, action: "read", detail: "to answer Atlas HR: “What exactly does Tidepool get on their Partner retainer?”" },
  { at: "2026-09-29T15:18:00+02:00", actor: "Sandra Tsapljoek", action: "opened", detail: "in Harbor" },
];
const REPORT_SENT = "2026-10-01T08:00:00+02:00";

export type Build = "careless" | "careful";
export type Tamper = "delete" | "edit" | "delete-rehash" | "edit-rehash";
export interface Entry {
  seq: number;
  at: string;
  actor: string;
  action: string;
  detail: string;
  prev?: string;
  hash?: string;
}
export interface Receipt {
  seq: number;
  hash: string;
  sentAt: string;
}
/** "missing": an entry points at a predecessor that isn't there. "changed": recomputing its hash gives another value. "receipt": the chain holds but no longer matches what Tidepool was sent. */
export type Check = { ok: true } | { ok: false; seq: number; why: "missing" | "changed" | "receipt" };
export interface LogState {
  careless: Entry[];
  careful: Entry[];
  receipt: Receipt;
  check: Check;
}

type Q = Parameters<Parameters<typeof withTx>[0]>[0];
type Row = { seq: number; at: Date; actor: string; action: string; detail: string; prev_hash?: string; hash?: string };

const iso = (d: Date | string) => new Date(d).toISOString();
export const digest = (prev: string, e: Omit<Entry, "prev" | "hash">) =>
  createHash("sha256")
    .update(`${prev}\n${JSON.stringify([e.seq, iso(e.at), e.actor, e.action, e.detail])}`)
    .digest("hex");

/** Re-numbers from 1 and re-hashes every entry: what someone with full access does to hide an edit. */
function chain(entries: Omit<Entry, "seq" | "prev" | "hash">[]): Entry[] {
  let prev = GENESIS;
  return entries.map((e, i) => {
    const hash = digest(prev, { ...e, seq: i + 1 });
    const out = { ...e, seq: i + 1, prev, hash };
    prev = hash;
    return out;
  });
}

export function verify(rows: Entry[], receipt: Receipt): Check {
  let prev = GENESIS;
  for (const [i, r] of rows.entries()) {
    if (r.seq !== i + 1 || r.prev !== prev) return { ok: false, seq: r.seq, why: "missing" };
    if (digest(prev, r) !== r.hash) return { ok: false, seq: r.seq, why: "changed" };
    prev = r.hash;
  }
  const at = rows.find((r) => r.seq === receipt.seq);
  return at && at.hash === receipt.hash ? { ok: true } : { ok: false, seq: receipt.seq, why: "receipt" };
}

const toEntry = (r: Row): Entry => ({ seq: r.seq, at: iso(r.at), actor: r.actor, action: r.action, detail: r.detail, ...(r.hash ? { prev: r.prev_hash, hash: r.hash } : {}) });

async function insertCareful(q: Q, session: string, rows: Entry[]) {
  for (const r of rows)
    await q("INSERT INTO priv.log_careful (session_id, seq, at, actor, action, detail, prev_hash, hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [session, r.seq, r.at, r.actor, r.action, r.detail, r.prev, r.hash]);
}
async function insertCareless(q: Q, session: string, rows: Omit<Entry, "seq">[]) {
  for (const [i, r] of rows.entries()) await q("INSERT INTO priv.log_careless (session_id, seq, at, actor, action, detail) VALUES ($1, $2, $3, $4, $5, $6)", [session, i + 1, r.at, r.actor, r.action, r.detail]);
}

/** Gives the visitor their own copy of September, once. */
async function ensure(session: string) {
  const [has] = await sql("SELECT 1 FROM priv.log_receipts WHERE session_id = $1", [session]);
  if (has) return;
  await withTx(async (q) => {
    await q("SELECT pg_advisory_xact_lock(hashtext($1))", [session]);
    if ((await q("SELECT 1 FROM priv.log_receipts WHERE session_id = $1", [session])).length) return;
    for (const t of ["log_careless", "log_careful", "log_receipts"]) await q(`DELETE FROM priv.${t} WHERE session_id = $1 OR created_at < now() - interval '1 day'`, [session]);
    const careful = chain(SEPTEMBER);
    await insertCareless(q, session, SEPTEMBER.filter((e) => e.actor !== BOT));
    await insertCareful(q, session, careful);
    const head = careful[careful.length - 1];
    await q("INSERT INTO priv.log_receipts (session_id, seq, hash, sent_at) VALUES ($1, $2, $3, $4)", [session, head.seq, head.hash, REPORT_SENT]);
  });
}

export async function state(session: string): Promise<LogState> {
  await ensure(session);
  const [careless, careful, [r]] = await Promise.all([
    sql<Row>("SELECT seq, at, actor, action, detail FROM priv.log_careless WHERE session_id = $1 ORDER BY seq", [session]),
    sql<Row>("SELECT seq, at, actor, action, detail, prev_hash, hash FROM priv.log_careful WHERE session_id = $1 ORDER BY seq", [session]),
    sql<{ seq: number; hash: string; sent_at: Date }>("SELECT seq, hash, sent_at FROM priv.log_receipts WHERE session_id = $1", [session]),
  ]);
  const receipt = { seq: r.seq, hash: r.hash, sentAt: iso(r.sent_at) };
  const c = careful.map(toEntry);
  return { careless: careless.map(toEntry), careful: c, receipt, check: verify(c, receipt) };
}

/** The app's way in: as audit_writer, which may only add entries. */
async function appendCareful(session: string, e: Omit<Entry, "seq">) {
  await withTx(async (q) => {
    await q("SET LOCAL ROLE audit_writer");
    await q("SELECT pg_advisory_xact_lock(hashtext($1))", [session]);
    const [last] = await q<{ seq: number; hash: string }>("SELECT seq, hash FROM priv.log_careful WHERE session_id = $1 ORDER BY seq DESC LIMIT 1", [session]);
    const seq = (last?.seq ?? 0) + 1;
    const prev = last?.hash ?? GENESIS;
    await insertCareful(q, session, [{ ...e, seq, prev, hash: digest(prev, { ...e, seq }) }]);
  });
}
async function appendCareless(session: string, e: Omit<Entry, "seq">) {
  await sql(
    "INSERT INTO priv.log_careless (session_id, seq, at, actor, action, detail) SELECT $1, COALESCE(MAX(seq), 0) + 1, $2, $3, $4, $5 FROM priv.log_careless WHERE session_id = $1",
    [session, e.at, e.actor, e.action, e.detail]
  );
}

export async function open(session: string) {
  await ensure(session);
  const e = { at: new Date().toISOString(), actor: "Tomás Pereira", action: "opened", detail: "in Harbor" };
  await Promise.all([appendCareless(session, e), appendCareful(session, e)]);
}

/** A real search, as the Part 1 bot runs it. Only the careful log writes down that it read the contract. */
export async function botRead(session: string): Promise<{ read: boolean; question: string }> {
  await ensure(session);
  const r = await search(BOT_QUESTION.q, CAREFUL);
  const read = r.hits.some((h) => h.doc === CONTRACT);
  if (read) await appendCareful(session, { at: new Date().toISOString(), actor: BOT, action: "read", detail: `to answer Atlas HR: “${BOT_QUESTION.q}”` });
  return { read, question: BOT_QUESTION.q };
}

/** Postgres's own answer when the app tries to change the careful log. */
async function asApp(session: string, seq: number): Promise<string> {
  try {
    await withTx(async (q) => {
      await q("SET LOCAL ROLE audit_writer");
      await q("DELETE FROM priv.log_careful WHERE session_id = $1 AND seq = $2", [session, seq]);
    });
    return "deleted";
  } catch (e) {
    return (e as Error).message;
  }
}

/** An edit always changes the name. */
const other = (actor: string) => (actor === "Sandra Tsapljoek" ? "Tomás Pereira" : "Sandra Tsapljoek");

/** With the owner key, which bypasses everything the app role can't do. */
async function rewrite(table: "log_careless" | "log_careful", session: string, seq: number, kind: Tamper) {
  await withTx(async (q) => {
    const rows = (await q<Row>(`SELECT seq, at, actor, action, detail, ${table === "log_careful" ? "prev_hash, hash" : "NULL AS hash"} FROM priv.${table} WHERE session_id = $1 ORDER BY seq`, [session])).map(toEntry);
    const del = kind.startsWith("delete");
    const kept = del ? rows.filter((r) => r.seq !== seq) : rows.map((r) => (r.seq === seq ? { ...r, actor: other(r.actor) } : r));
    const rehash = kind.endsWith("rehash") || table === "log_careless";
    if (!rehash) {
      if (del) await q(`DELETE FROM priv.${table} WHERE session_id = $1 AND seq = $2`, [session, seq]);
      else await q(`UPDATE priv.${table} SET actor = $3 WHERE session_id = $1 AND seq = $2`, [session, seq, other(rows.find((r) => r.seq === seq)?.actor ?? "")]);
      return;
    }
    await q(`DELETE FROM priv.${table} WHERE session_id = $1`, [session]);
    if (table === "log_careless") await insertCareless(q, session, kept);
    else await insertCareful(q, session, chain(kept));
  });
}

/** The demo's tamper: hide Vlas's download, in both logs. */
export async function tamper(session: string, kind: "delete" | "delete-rehash"): Promise<{ app: string }> {
  await ensure(session);
  const find = (t: string) => sql<{ seq: number }>(`SELECT seq FROM priv.${t} WHERE session_id = $1 AND actor = $2 ORDER BY seq LIMIT 1`, [session, TARGET]);
  const [[cl], [cf]] = await Promise.all([find("log_careless"), find("log_careful")]);
  if (cl) await rewrite("log_careless", session, cl.seq, kind);
  if (!cf) return { app: "nothing to delete" };
  const app = await asApp(session, cf.seq);
  await rewrite("log_careful", session, cf.seq, kind);
  return { app };
}

export async function reset(session: string) {
  for (const t of ["log_careless", "log_careful", "log_receipts"]) await sql(`DELETE FROM priv.${t} WHERE session_id = $1`, [session]);
}

/** One experiment run: a fresh log, two October entries, then one tamper on one entry. */
export async function trial(session: string, seq: number, kind: Tamper): Promise<{ target: string; app: string; check: Check }> {
  try {
    await ensure(session);
    const now = Date.now();
    await appendCareful(session, { at: new Date(now - 3_600_000).toISOString(), actor: "Tomás Pereira", action: "opened", detail: "in Harbor" });
    await appendCareful(session, { at: new Date(now).toISOString(), actor: BOT, action: "read", detail: `to answer Atlas HR: “${BOT_QUESTION.q}”` });
    const [t] = await sql<{ actor: string }>("SELECT actor FROM priv.log_careful WHERE session_id = $1 AND seq = $2", [session, seq]);
    const app = await asApp(session, seq);
    await rewrite("log_careful", session, seq, kind);
    return { target: t?.actor ?? "", app, check: (await state(session)).check };
  } finally {
    await reset(session);
  }
}

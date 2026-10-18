import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { TTL_MINUTES, type Links, type Opened, type Step, type Tried } from "./link-steps";

const PROJECT = 1049;
const SHARED = "Website Sprint proposal.pdf";
const OTHER = "Accessibility fixes.xlsx";
const BASE = "https://harbor.northwind.example";

export type Viewer = "freelancer" | "stranger";

// The lab has no separate signing secret; a key derived from the owner secret is never shown or reused elsewhere.
const key = () => createHmac("sha256", process.env.LAB_OWNER_SECRET ?? "").update("privacy-links").digest();
const mac = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");
const payload = (file: number, who: string, exp: number, grant: number) => `${file}|${who}|${exp}|${grant}`;
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" });

async function fileByName(name: string) {
  const [f] = await sql<{ id: number; name: string }>("SELECT id, name FROM harbor.files WHERE project_id = $1 AND name = $2", [PROJECT, name]);
  return f;
}

export function signed(file: number, who: string, grant: number, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TTL_MINUTES * 60;
  return `${BASE}/s/${file}?for=${who}&exp=${exp}&g=${grant}&sig=${mac(payload(file, who, exp, grant))}`;
}

/** Vlas shares the proposal with the freelancer: one permanent address, one signed link. */
export async function share(session: string): Promise<Links> {
  await sql("DELETE FROM priv.link_grants WHERE session_id = $1 OR created_at < now() - interval '1 day'", [session]);
  const f = await fileByName(SHARED);
  const [g] = await sql<{ id: number }>("INSERT INTO priv.link_grants (session_id, grantee, file_id) VALUES ($1, 'freelancer', $2) RETURNING id", [session, f.id]);
  return { careless: `${BASE}/f/${PROJECT}/${encodeURIComponent(SHARED)}`, careful: signed(f.id, "freelancer", Number(g.id)) };
}

/** The address is the only key. */
export async function openCareless(url: string): Promise<Opened> {
  const m = new URL(url, BASE).pathname.match(/^\/f\/(\d+)\/(.+)$/);
  if (!m) return { status: 404, why: "No such file." };
  const [f] = await sql<{ name: string }>("SELECT name FROM harbor.files WHERE project_id = $1 AND name = $2", [Number(m[1]), decodeURIComponent(m[2])]);
  return f ? { status: 200, file: f.name, why: "Opened. Nobody asked who." } : { status: 404, why: "No such file." };
}

/** Checked at the click: signature, expiry, person, and whether the share still exists. */
export async function openCareful(session: string, url: string, viewer: Viewer, now = Date.now()): Promise<Opened> {
  let u: URL;
  try {
    u = new URL(url, BASE);
  } catch {
    return { status: 400, why: "Not a link." };
  }
  const file = Number(u.pathname.match(/^\/s\/(\d+)$/)?.[1]);
  const [who, exp, grant, sig] = [u.searchParams.get("for") ?? "", Number(u.searchParams.get("exp")), Number(u.searchParams.get("g")), u.searchParams.get("sig") ?? ""];
  const want = Buffer.from(mac(payload(file, who, exp, grant)));
  const got = Buffer.from(sig);
  if (!file || got.length !== want.length || !timingSafeEqual(got, want)) return { status: 400, why: "The signature doesn't match. The link was changed." };
  if (now / 1000 > exp) return { status: 410, why: `Expired at ${hhmm(exp * 1000)}. Ask for a new one.` };
  if (viewer !== who) return { status: 403, why: `This link was made for the ${who}. Sign in as them.` };
  const [g] = await sql<{ revoked_at: Date | null; name: string }>(
    "SELECT g.revoked_at, f.name FROM priv.link_grants g JOIN harbor.files f ON f.id = g.file_id WHERE g.session_id = $1 AND g.id = $2 AND g.file_id = $3",
    [session, grant, file]
  );
  if (!g) return { status: 403, why: "This share doesn't exist." };
  if (g.revoked_at) return { status: 403, why: `Access removed at ${hhmm(g.revoked_at.getTime())}. The link died with it.` };
  return { status: 200, file: g.name, why: "Opened. Signed, in time, right person, still shared." };
}

/** One step, both links. "revoked" makes a fresh pair first, so it's the revoke that stops it, not the clock. */
export async function attempt(session: string, step: Step, links: Links): Promise<Tried> {
  let l = links;
  let viewer: Viewer = "freelancer";
  let now = Date.now();
  if (step === "forward") viewer = "stranger";
  if (step === "later") now += (TTL_MINUTES + 1) * 60_000;
  if (step === "revoked") {
    l = await share(session);
    await sql("UPDATE priv.link_grants SET revoked_at = now() WHERE session_id = $1", [session]);
  }
  if (step === "edited") {
    const other = await fileByName(OTHER);
    const u = new URL(l.careful, BASE);
    l = { careless: l.careless.replace(encodeURIComponent(SHARED), encodeURIComponent(OTHER)), careful: `${BASE}/s/${other.id}${u.search}` };
  }
  const [careless, careful] = await Promise.all([openCareless(l.careless), openCareful(session, l.careful, viewer, now)]);
  return { step, links: l, careless, careful };
}

/** Random signatures and edited fields on a valid link. None should open. */
export async function forge(session: string, links: Links, n: number): Promise<number> {
  const u = new URL(links.careful, BASE);
  let opened = 0;
  for (let i = 0; i < n; i++) {
    const v = new URL(u);
    if (i % 2) v.searchParams.set("sig", randomBytes(32).toString("base64url"));
    else v.searchParams.set(["for", "exp", "g"][i % 3], ["stranger", String(Number(u.searchParams.get("exp")) + 86_400 * (1 + (i % 30))), String(Number(u.searchParams.get("g")) + 1 + (i % 7))][i % 3]);
    if ((await openCareful(session, v.toString(), v.searchParams.get("for") === "stranger" ? "stranger" : "freelancer")).status === 200) opened++;
  }
  return opened;
}

export async function reset(session: string) {
  await sql("DELETE FROM priv.link_grants WHERE session_id = $1", [session]);
}

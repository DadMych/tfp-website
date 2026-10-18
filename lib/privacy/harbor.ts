import { sql, withTx } from "@/lib/db";
import type { ClientId } from "./access";

/** The lab's Harbor: one project per client, a few files each (db/migrations/0017_harbor.sql). */

export interface HFile {
  name: string;
  size_kb: number;
  updated: string;
  client: string;
}

export interface Portal {
  status: 200 | 404;
  /** Whose project the portal says this is. Null when it doesn't say. */
  owner: string | null;
  files: HFile[];
  /** The database role the query ran as, and whether that role skips row-level security. */
  role: string;
  bypass: boolean;
  /** Careful only: rows the database returns on its own, with the app check skipped. */
  dbOnly?: number;
}

const FILES = "SELECT name, size_kb, updated::text, client FROM harbor.files WHERE project_id = $1 ORDER BY updated DESC, id";
const WHO = "SELECT current_user AS role, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user";
type Q = Parameters<Parameters<typeof withTx>[0]>[0];

async function asClient<T>(viewer: ClientId, fn: (q: Q) => Promise<T>): Promise<T> {
  return withTx(async (q) => {
    await q("SET LOCAL ROLE harbor_client");
    await q("SELECT set_config('harbor.client', $1, true)", [viewer]);
    return fn(q);
  });
}

/** Logged in is enough: whatever project number is in the address. */
export async function careless(project: number): Promise<Portal> {
  const [[p], files, [who]] = await Promise.all([
    sql<{ client: string }>("SELECT client FROM harbor.projects WHERE id = $1", [project]),
    sql<HFile>(FILES, [project]),
    sql<{ role: string; bypass: boolean }>(WHO),
  ]);
  return { status: p ? 200 : 404, owner: p?.client ?? null, files, ...who };
}

/** The policy is written and the client is set, but the app's own role skips row-level security. */
export async function ownerKey(viewer: ClientId, project: number): Promise<Portal> {
  return withTx(async (q) => {
    await q("SELECT set_config('harbor.client', $1, true)", [viewer]);
    const [p] = await q<{ client: string }>("SELECT client FROM harbor.projects WHERE id = $1", [project]);
    const files = await q<HFile>(FILES, [project]);
    const [who] = await q<{ role: string; bypass: boolean }>(WHO);
    return { status: p ? 200 : 404, owner: p?.client ?? null, files, ...who };
  });
}

/** The app checks the project is yours, and the query runs as a role the policy applies to. */
export async function careful(viewer: ClientId, project: number): Promise<Portal> {
  const [p] = await sql<{ client: string }>("SELECT client FROM harbor.projects WHERE id = $1", [project]);
  return asClient(viewer, async (q) => {
    const files = await q<HFile>(FILES, [project]);
    const [who] = await q<{ role: string; bypass: boolean }>(WHO);
    const mine = p?.client === viewer;
    // Not yours and missing look the same: a 404 doesn't confirm the project exists.
    return { status: mine ? 200 : 404, owner: mine ? viewer : null, files: mine ? files : [], ...who, dbOnly: files.length };
  });
}

export interface SweepRow {
  id: number;
  client: string;
  name: string;
  careless: number;
  ownerKey: number;
  carefulStatus: 200 | 404;
  dbOnly: number;
}

/** Every project number, opened as one client by each portal. Real queries, run on page load. */
export async function sweep(viewer: ClientId): Promise<SweepRow[]> {
  const COUNT = "SELECT p.id, p.client, p.name, count(f.id)::int AS n FROM harbor.projects p LEFT JOIN harbor.files f ON f.project_id = p.id GROUP BY p.id ORDER BY p.id";
  const [all, owner, db] = await Promise.all([
    sql<{ id: number; client: string; name: string; n: number }>(COUNT),
    withTx(async (q) => {
      await q("SELECT set_config('harbor.client', $1, true)", [viewer]);
      return q<{ id: number; n: number }>(COUNT);
    }),
    asClient(viewer, (q) => q<{ project_id: number; n: number }>("SELECT project_id, count(*)::int AS n FROM harbor.files GROUP BY project_id")),
  ]);
  return all.map((p) => ({
    id: p.id,
    client: p.client,
    name: p.name,
    careless: p.n,
    ownerKey: owner.find((o) => o.id === p.id)?.n ?? 0,
    carefulStatus: p.client === viewer ? 200 : 404,
    dbOnly: db.find((d) => d.project_id === p.id)?.n ?? 0,
  }));
}

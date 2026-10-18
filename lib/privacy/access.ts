// Who may open which of the bot's 140 files, as Harbor would see it. A lab map, not a fact in the files.

export const CLIENTS = {
  acme: "Acme Tools",
  atlas: "Atlas HR",
  becker: "Becker Freight",
  brightlane: "Brightlane",
  halden: "Halden Health",
  kestrel: "Kestrel Analytics",
  ortiz: "Ortiz Studio",
  quill: "Quill Notes",
  tidepool: "Tidepool Payments",
  verdant: "Verdant Energy",
} as const;
export type ClientId = keyof typeof CLIENTS;

/** Clients with a confidentiality clause: their case studies stay internal. */
const CONFIDENTIAL: ClientId[] = ["tidepool", "halden"];

export type Audience = { kind: "public" } | { kind: "staff" } | { kind: "client"; client: ClientId };

const STAFF = /^(hb|slack|mtg|okr|survey|postmortem|pitch|sales|draft)-|^ref-team-directory$|^mail-(press|nonprofit|prospect)/;
const OWNED = /^(?:mail|proposal|brief|status|case|handoff-notes)-([a-z]+)/;

export function audienceOf(slug: string): Audience {
  if (STAFF.test(slug)) return { kind: "staff" };
  const id = slug.match(OWNED)?.[1] as ClientId | undefined;
  if (id && id in CLIENTS && (!slug.startsWith("case-") || CONFIDENTIAL.includes(id))) return { kind: "client", client: id };
  return { kind: "public" };
}

/** A client sees the public files and its own. */
export function canSee(viewer: ClientId, slug: string): boolean {
  const a = audienceOf(slug);
  return a.kind === "public" || (a.kind === "client" && a.client === viewer);
}

export const allowedDocs = (viewer: ClientId, slugs: string[]) => slugs.filter((s) => canSee(viewer, s));

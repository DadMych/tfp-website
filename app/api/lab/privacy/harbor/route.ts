import { badRequest, bump, rateLimit, rateLimitHeaders, tooMany } from "@/lib/lab/request";
import { getLiveDemo } from "@/lib/lab-config";
import { CLIENTS, type ClientId } from "@/lib/privacy/access";
import { careful, careless, ownerKey } from "@/lib/privacy/harbor";
import { privacyLimits } from "@/lib/privacy-lab";

export const dynamic = "force-dynamic";

/** POST { as, project } → the same address opened in three portals. Real queries against harbor.*. */
export async function POST(req: Request) {
  if (!getLiveDemo("privacy")) return new Response("not found", { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { as?: unknown; project?: unknown };
  const project = Number(body.project);
  if (!Number.isInteger(project) || project < 1 || project > 99999) return badRequest("Project numbers are whole numbers.");
  if (typeof body.as !== "string" || !(body.as in CLIENTS)) return badRequest("Pick who you're logged in as.");
  const as = body.as as ClientId;

  const rl = await rateLimit(req, "priv_harbor", privacyLimits.opensPerHour);
  if (!rl.ok) return tooMany(rl);
  const [a, b, c] = await Promise.all([careless(project), ownerKey(as, project), careful(as, project)]);
  await Promise.all([bump("p4_iso_tries"), bump("p4_iso_careless_files", a.files.filter((f) => f.client !== as).length)]);
  return Response.json({ careless: a, ownerKey: b, careful: c, remaining: rl.remaining }, { headers: rateLimitHeaders(rl) });
}

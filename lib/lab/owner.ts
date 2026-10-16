import { timingSafeEqual } from "node:crypto";

/** Owner-only endpoints check header x-lab-owner against LAB_OWNER_SECRET. */
export function isOwner(req: Request): boolean {
  const want = process.env.LAB_OWNER_SECRET;
  const got = req.headers.get("x-lab-owner");
  if (!want || !got || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

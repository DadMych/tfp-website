import type { Level, RequestEvent } from "@/lib/lab/double-spend";
import { hasWrite, landTime } from "./AttackScene";

export interface Caption {
  t: number;
  tech: string;
  plain: string;
}

const $ = (c: number) => (c < 0 ? "−" : "") + (c % 100 === 0 ? `$${Math.abs(c) / 100}` : `$${(Math.abs(c) / 100).toFixed(2)}`);

/** Key moments of an attack, derived from the measured timings. Sorted by t. */
export function narrate(events: RequestEvent[], level: Level, start: number, amount: number, concurrency: number, extracted: number | null): Caption[] {
  if (events.length === 0) return [];
  const caps: Caption[] = [];
  const maxFunded = Math.floor(start / amount);
  const byT0 = [...events].sort((a, b) => a.t0 - b.t0);
  const byT1 = [...events].sort((a, b) => a.t1 - b.t1);
  const reads = events.filter((e) => e.tRead !== null).sort((a, b) => a.tRead! - b.tRead!);
  const writes = events.filter(hasWrite).map((e) => ({ e, land: landTime(e) })).sort((a, b) => a.land - b.land);
  const firstLand = writes[0]?.land ?? Infinity;
  const n = events.length;

  caps.push({
    t: byT0[0].t0 - 40,
    tech: `${n} requests, ${concurrency} in flight. Go.`,
    plain: `${n} payments, ${concurrency} at the same instant. Go.`,
  });

  if (level === 0) {
    if (writes[0]) {
      const e = writes[0].e;
      caps.push({
        t: writes[0].land,
        tech: `#${e.seq + 1} runs UPDATE. Nobody asked what the balance was.`,
        plain: `#${e.seq + 1} is paid. Nobody checked the balance first.`,
      });
    }
    const neg = writes.find((w) => (w.e.after ?? 0) < 0);
    if (neg) caps.push({ t: neg.land, tech: `Balance is negative. The database was never asked to object.`, plain: `The card is below zero and still paying.` });
  }

  if (level === 1 || level === 2 || level === 3) {
    if (reads[0]) {
      caps.push({
        t: reads[0].tRead!,
        tech: `#${reads[0].seq + 1} reads ${$(reads[0].read ?? 0)}.`,
        plain: `#${reads[0].seq + 1} asks the bank: ${$(reads[0].read ?? 0)} left.`,
      });
    }
    const staleReads = reads.filter((e) => e.tRead! < firstLand);
    if (level !== 3 && staleReads.length >= 2) {
      const k = staleReads.length;
      caps.push({
        t: staleReads[k - 1].tRead!,
        tech: `${k} requests have read ${$(start)}. Nobody has written yet. All ${k} will approve.`,
        plain: `${k} payments all saw ${$(start)}. Not one of them has paid yet. All ${k} will say yes.`,
      });
    }
    if (writes[0] && level !== 3) {
      const e = writes[0].e;
      caps.push({
        t: writes[0].land,
        tech: `#${e.seq + 1} writes ${$(e.after ?? 0)}. The others do the same arithmetic on the same stale number.`,
        plain: `#${e.seq + 1} sets the balance to ${$(e.after ?? 0)}. The others will write the same number, because they all saw the same old one.`,
      });
    }
    if (level === 2 && writes[1]) {
      caps.push({
        t: writes[1].land + 1,
        tech: `Pod A serialized its half. Pod B serialized its half. Neither saw the other.`,
        plain: `Each copy of the shop kept its own line. Neither knew about the other.`,
      });
    }
    if (level === 3) {
      const q = byT0.filter((e) => e.t0 < (reads[0]?.tRead ?? 0)).length;
      if (reads[0] && q >= 2) {
        caps.push({
          t: reads[0].tRead! + 1,
          tech: `#${reads[0].seq + 1} holds the row lock. ${q - 1} others block on it.`,
          plain: `#${reads[0].seq + 1} is inside the bank. ${q - 1} wait in line.`,
        });
      }
      if (writes[0]) {
        const e = writes[0].e;
        caps.push({
          t: writes[0].land,
          tech: `#${e.seq + 1} writes and commits. The next in line reads the new number, not the old one.`,
          plain: `#${e.seq + 1} pays. The next one in line sees the new balance, not the old one.`,
        });
      }
      const longest = reads.reduce<RequestEvent | null>((m, e) => (m === null || e.tRead! - e.t0 > m.tRead! - m.t0 ? e : m), null);
      if (longest && longest.tRead! - longest.t0 > 50) {
        caps.push({
          t: longest.tRead!,
          tech: `#${longest.seq + 1} waited ${longest.tRead! - longest.t0} ms for the lock. That wait is the price of being right.`,
          plain: `#${longest.seq + 1} stood in line for ${longest.tRead! - longest.t0} ms. Nobody got cheated; everybody waited.`,
        });
      }
      const firstDecline = byT1.find((e) => e.outcome === "declined");
      if (firstDecline) {
        caps.push({
          t: firstDecline.tRead ?? firstDecline.t1,
          tech: `#${firstDecline.seq + 1} gets the lock, reads ${$(firstDecline.read ?? 0)}, declines. Correct. Slow.`,
          plain: `#${firstDecline.seq + 1} gets its turn, sees ${$(firstDecline.read ?? 0)}, is turned away. Correct, just slow.`,
        });
      }
    }
  }

  if (level === 4) {
    const landed = events.map((e) => ({ e, land: landTime(e) })).sort((a, b) => a.land - b.land);
    const first = landed.find((w) => w.e.outcome === "approved");
    if (first) {
      caps.push({
        t: first.land,
        tech: `#${first.e.seq + 1}: one UPDATE checked and took ${$(amount)}. No read, no gap.`,
        plain: `#${first.e.seq + 1}: the bank checked and took ${$(amount)} in one move. No gap to slip through.`,
      });
    }
    const last = landed.find((w) => w.e.outcome === "approved" && (w.e.after ?? 1) < amount);
    if (last) {
      caps.push({
        t: last.land,
        tech: `#${last.e.seq + 1} took the last ${$(amount)}. Every UPDATE after this matches zero rows.`,
        plain: `#${last.e.seq + 1} took the last ${$(amount)}. Everyone after is told no.`,
      });
    }
    const firstDecline = byT1.find((e) => e.outcome === "declined");
    if (firstDecline) {
      caps.push({
        t: landTime(firstDecline),
        tech: `#${firstDecline.seq + 1}: WHERE balance_cents ≥ ${amount} matched zero rows. Declined under the lock.`,
        plain: `#${firstDecline.seq + 1}: the bank checked, found ${$(firstDecline.after ?? 0)}, said no.`,
      });
    }
    const refused = byT1.find((e) => e.outcome === "refused");
    if (refused) caps.push({ t: landTime(refused), tech: `CHECK constraint refused a write the code let through.`, plain: `The bank's own rule stopped a payment the shop allowed.` });
  }

  // the moment approvals outrun the money
  let approvals = 0;
  for (const e of byT1) {
    if (e.outcome !== "approved") continue;
    approvals++;
    if (approvals === maxFunded + 1) {
      caps.push({
        t: e.t1 + 45,
        tech: `Approved payments just passed ${$(start)}. Everything after this is money from nowhere.`,
        plain: `More has been paid out than the card ever held. From here on it is free money.`,
      });
      break;
    }
  }

  const lastT1 = byT1[byT1.length - 1].t1;
  if (level === 3)
    caps.push({
      t: lastT1,
      tech: `All ${n} answered by ${lastT1} ms. Each one held the row lock across three round trips while the rest waited.`,
      plain: `All ${n} answered by ${lastT1} ms. Each one held the card for three trips to the bank while the rest waited.`,
    });
  if (level === 4)
    caps.push({
      t: lastT1,
      tech: `All ${n} answered by ${lastT1} ms. Postgres still took them one at a time, but each held the row for one statement.`,
      plain: `All ${n} answered by ${lastT1} ms. The bank still took them one at a time, but each took a blink, so no line built up.`,
    });

  const end = lastT1 + 50;
  const approved = events.filter((e) => e.outcome === "approved").length;
  if (extracted !== null) {
    caps.push(
      extracted > 0
        ? { t: end, tech: `${approved} approved, ${maxFunded} funded. ${$(extracted)} extracted.`, plain: `${approved} payments accepted. The card could afford ${maxFunded}. You walked away with ${$(extracted)}.` }
        : { t: end, tech: `${approved} approved, ${n - approved} declined, ${$(0)} extracted.`, plain: `${approved} accepted, ${n - approved} turned away. Nothing for free.` }
    );
  }

  return caps.sort((a, b) => a.t - b.t);
}

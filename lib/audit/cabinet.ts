import { sql, withTx } from "@/lib/db";
import { bump } from "@/lib/lab/request";
import { verify, sign } from "@/lib/lab/webhooks";
import { INVOICES, invoiceByNumber, VIEWER, type Invoice } from "./invoices";

/** The forged webhook body the careless cabinet believes and the careful one rejects. */
export function webhookBody(invoice: string): string {
  return JSON.stringify({ id: `evt_${invoice}`, type: "payment.captured", order_id: invoice, created: Math.floor(Date.now() / 1000) });
}

// ── Finding: change the number, read someone else's invoice ──────────────────

export interface OpenResult {
  number: string;
  careless: { status: 200 | 404; invoice: Invoice | null; mine: boolean };
  careful: { status: 200 | 404; invoice: Invoice | null; mine: boolean };
}

/** Careless: logged in is enough, any number opens. Careful: the invoice must be yours. */
export function openInvoice(number: string): OpenResult {
  const inv = invoiceByNumber(number) ?? null;
  const mine = inv?.client === VIEWER;
  return {
    number,
    careless: { status: inv ? 200 : 404, invoice: inv, mine },
    careful: { status: mine ? 200 : 404, invoice: mine ? inv : null, mine },
  };
}

// ── Findings: double-tap Pay, and the forged webhook ─────────────────────────

const DAY = "DELETE FROM cab.payments WHERE created_at < now() - interval '1 day'";

export interface PaidState {
  charged: number;
  totalCents: number;
}

async function state(session: string, build: "careless" | "careful", invoice: string): Promise<PaidState> {
  const [r] = await sql<{ n: string; total: string }>(
    "SELECT count(*)::int AS n, coalesce(sum(amount_cents),0)::bigint AS total FROM cab.payments WHERE session=$1 AND build=$2 AND invoice=$3",
    [session, build, invoice]
  );
  return { charged: Number(r.n), totalCents: Number(r.total) };
}

export interface PayResult {
  invoice: string;
  taps: number;
  careless: PaidState;
  careful: PaidState;
}

/**
 * A rapid double-tap: `taps` presses of Pay for one invoice intent.
 * Careless has no key, so every tap is a charge. Careful carries one key per
 * payment; the unique index in Postgres turns the extra taps into no-ops.
 */
export async function pay(session: string, number: string, taps: number): Promise<PayResult> {
  const inv = invoiceByNumber(number);
  if (!inv) throw new Error("no such invoice");
  const key = `pi_${number}`;
  await withTx(async (q) => {
    await q(DAY);
    for (let i = 0; i < taps; i++) {
      await q("INSERT INTO cab.payments (session, build, invoice, amount_cents, source) VALUES ($1,'careless',$2,$3,'tap')", [session, number, inv.amountCents]);
      await q(
        "INSERT INTO cab.payments (session, build, invoice, amount_cents, idem_key, source) VALUES ($1,'careful',$2,$3,$4,'tap') ON CONFLICT DO NOTHING",
        [session, number, inv.amountCents, key]
      );
    }
  });
  await bump("p5_shows");
  const [careless, careful] = await Promise.all([state(session, "careless", number), state(session, "careful", number)]);
  return { invoice: number, taps, careless, careful };
}

export interface WebhookResult {
  invoice: string;
  forged: boolean;
  careless: { accepted: boolean; paid: PaidState };
  careful: { accepted: boolean; reason: string; paid: PaidState };
}

/**
 * The payment provider says "paid". Careless believes any POST. Careful checks
 * the signature over the raw body first (lib/lab/webhooks.ts), so a forged
 * message — no signature, or a made-up one — changes nothing.
 */
export async function sendWebhook(session: string, number: string, forged: boolean): Promise<WebhookResult> {
  const inv = invoiceByNumber(number);
  if (!inv) throw new Error("no such invoice");
  const body = webhookBody(number);
  const signature = forged ? null : sign(body);
  const verified = verify(body, signature);

  await withTx(async (q) => {
    await q(DAY);
    // Careless: no check, the "paid" message is applied as sent.
    await q("INSERT INTO cab.payments (session, build, invoice, amount_cents, source, verified) VALUES ($1,'careless',$2,$3,'webhook',$4)", [session, number, inv.amountCents, verified]);
    // Careful: only a verified message is kept.
    if (verified) await q("INSERT INTO cab.payments (session, build, invoice, amount_cents, source, verified) VALUES ($1,'careful',$2,$3,'webhook',TRUE)", [session, number, inv.amountCents]);
  });
  await bump("p5_shows");
  if (forged) await bump("p5_forged_paid");

  const [careless, careful] = await Promise.all([state(session, "careless", number), state(session, "careful", number)]);
  return {
    invoice: number,
    forged,
    careless: { accepted: true, paid: careless },
    careful: { accepted: verified, reason: verified ? "signature valid" : "no valid signature — ignored", paid: careful },
  };
}

export async function reset(session: string): Promise<void> {
  await sql("DELETE FROM cab.payments WHERE session=$1", [session]);
}

/** Shown on the page: the demo invoices and which one is yours. */
export const catalogue = INVOICES;

import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import MoneyShell from "@/components/lab/money/MoneyShell";
import IdempotencyDemo from "@/components/lab/money/IdempotencyDemo";
import CodeSnippet from "@/components/work/CodeSnippet";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab/money/idempotency", "Idempotency — Money Lab", "Twenty identical charge requests at once. No key, a key checked in code, a key owned by the database. Live against Postgres.");

const bad = {
  lang: "ts",
  filename: "check-then-insert.ts",
  caption: "Looks idempotent. Is a race. Every request that arrives before the first one reaches line 9 passes the check.",
  code: `const seen = await db.query(
  "SELECT 1 FROM idempotency_keys WHERE key = $1",
  [idemKey]
);
if (seen.rowCount) return storedResponse(idemKey);

const charge = await db.query(
  "INSERT INTO charges (order_id, amount_cents) VALUES ($1, $2) RETURNING id",
  [orderId, amount]
);
await db.query(
  "INSERT INTO idempotency_keys (key, charge_id) VALUES ($1, $2)",
  [idemKey, charge.rows[0].id]
);
return created(charge.rows[0]);`,
};

const good = {
  lang: "ts",
  filename: "claim-the-key.ts",
  caption: "The key is a primary key and the claim is the first write of the transaction. Concurrent racers block on the row, then get zero rows, then replay.",
  code: `await db.query("BEGIN");

const claim = await db.query(
  \`INSERT INTO idempotency_keys (key) VALUES ($1)
   ON CONFLICT DO NOTHING RETURNING key\`,
  [idemKey]
);
if (claim.rowCount === 0) {
  await db.query("ROLLBACK");
  return storedResponse(idemKey);   // may be "in progress": return 409
}

const charge = await db.query(
  "INSERT INTO charges (order_id, amount_cents) VALUES ($1, $2) RETURNING id",
  [orderId, amount]
);
await db.query(
  "UPDATE idempotency_keys SET charge_id = $2, response = $3 WHERE key = $1",
  [idemKey, charge.rows[0].id, created(charge.rows[0])]
);
await db.query("COMMIT");`,
};

const provider = {
  lang: "ts",
  filename: "provider-key.ts",
  caption:
    "Level three, not runnable in this lab: no payment provider here. Your own key goes to the provider so a crash between their charge and your COMMIT still cannot bill twice.",
  code: `const intent = await stripe.paymentIntents.create(
  { amount, currency: "eur", metadata: { order_id: orderId } },
  { idempotencyKey: \`charge:\${orderId}\` }
);
// Same key, same request body → Stripe returns the same intent.
// Different body with the same key → Stripe refuses. That is the point.`,
};

export default function Page() {
  return (
    <MoneyShell slug="idempotency">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="A client times out and retries. A mobile app double-taps. A queue redelivers. All of them look like this: the same request, many times, at once."
        plainLede="Phones lose signal and try again. People double-tap. Every one of those is the same payment sent twice, or twenty times. Press the button and watch what each version of the shop does with it."
      >
        <IdempotencyDemo />
      </Section>

      <Section n="02" title="Three levels" plainTitle="Three places to stop it">
        <Points
          items={[
            {
              title: "1 · Request key",
              plainTitle: "1 · A receipt number from the app",
              body: (
                <>
                  The client sends <span className="font-mono text-sm">Idempotency-Key</span>. The server stores key and response and replays on repeat. The middle column
                  is what happens when the store is a lookup instead of a claim. The right column is the claim.
                </>
              ),
              plainBody:
                "The app sends a unique number with every payment attempt, and reuses it when it retries. If the shop has already seen that number, it returns the old answer instead of charging again.",
            },
            {
              title: "2 · Business key",
              plainTitle: "2 · One payment per order",
              body: (
                <>
                  Clients forget to send keys. So the data itself carries one: <span className="font-mono text-sm">UNIQUE (order_id) WHERE status = &apos;paid&apos;</span>.
                  An order cannot be paid twice because the table will not hold two paid rows for it.
                </>
              ),
              plainBody:
                "Apps forget to send numbers. So the shop also refuses to hold two paid receipts for the same order. That rule lives in the database, where nobody can forget it.",
            },
            {
              title: "3 · Provider key",
              plainTitle: "3 · Tell the card company too",
              body: "The provider charged the card and then your process died before COMMIT. Your retry will charge again unless the provider also knows the key. Pass it through. Every serious provider supports it.",
              plainBody:
                "The card company charged the card, then our server crashed before writing it down. The retry would charge again, unless the card company also got our receipt number. Every serious provider accepts one.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the handlers that run when you press the button." plainLede="What runs behind the button, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version asks the database 'have I seen this receipt number?' and then writes. The good version writes the number first, and the database refuses everyone who comes second.">
          <div className="flex flex-col gap-8">
            <CodeCompare bad={bad} good={good} />
            <div className="lg:w-1/2 lg:ml-auto">
              <CodeSnippet snippet={provider} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why does check-then-insert still charge every time?" plain="Why does checking a list first still fail?" />}>
            <p>
              <T
                tech="SELECT then INSERT is two statements. Between them every other concurrent request runs the same SELECT and sees nothing. The only way to make 'check and claim' atomic is a single INSERT whose uniqueness the database enforces."
                plain="Twenty requests arrive together. Each one looks at the list, sees it empty, and goes ahead. Looking and writing are two separate steps, and everyone finishes step one before anyone finishes step two."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What should the retry get back: the stored answer or an error?" plain="What should the second attempt see?" />}>
            <p>
              <T
                tech="The stored response with the same status code. If the first request is still running, 409 with Retry-After. Never a fresh charge, never a 500."
                plain="The same answer the first attempt got. If the first attempt is still in progress, a polite 'still working, try again in a second'."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How long do you keep keys?" plain="How long does the shop remember a receipt number?" />}>
            <p>
              <T
                tech="24 hours is the common provider default, long enough to outlive any retry policy. Store key, request hash, response and created_at; a different body on the same key is a 422."
                plain="About a day. Longer than any phone or queue will keep retrying."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Does this replace the double-spend fix?" plain="Is this the same thing as the double-spend article?" />}>
            <p>
              <T
                tech="No. Idempotency handles the same request repeated. Row locks and constraints handle different requests competing. Production needs both."
                plain="No. This stops one payment from being charged twice. Double-spend is about two different payments racing for the same money. You need both."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </MoneyShell>
  );
}

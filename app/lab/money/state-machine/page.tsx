import type { Metadata } from "next";
import MoneyShell from "@/components/lab/money/MoneyShell";
import StateMachineDemo from "@/components/lab/money/StateMachineDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "State Machine — Money Lab",
  description: "A payment with five states. Refund it twice, capture a voided one. Then the version with a transition table and a version column.",
  alternates: { canonical: "/lab/money/state-machine" },
};

const bad = {
  lang: "ts",
  filename: "refund-naive.ts",
  caption: "Any state goes to any state. Two staff members click refund within the same second and both requests pass. The provider happily refunds twice.",
  code: `export async function refund(paymentId: string) {
  const p = await db.one("SELECT * FROM payments WHERE id = $1", [paymentId]);

  await provider.refund(p.provider_charge_id, p.amount_cents);

  await db.query(
    \`UPDATE payments
        SET state = 'refunded',
            refunded_cents = refunded_cents + $2
      WHERE id = $1\`,
    [paymentId, p.amount_cents]
  );
}`,
};

const good = {
  lang: "ts",
  filename: "refund-guarded.ts",
  caption:
    "The transition is claimed in the database before the provider is called. The second click loses the UPDATE, gets zero rows, and never reaches the provider. The CHECK is the last line of defence.",
  code: `const TRANSITIONS = {
  authorize: { from: ["created"],    to: "authorized" },
  capture:   { from: ["authorized"], to: "captured" },
  void:      { from: ["authorized"], to: "voided" },
  refund:    { from: ["captured"],   to: "refunded" },
};

export async function refund(paymentId: string, seenVersion: number) {
  const t = TRANSITIONS.refund;
  const { rows } = await db.query(
    \`UPDATE payments
        SET state = $2, refunded_cents = refunded_cents + amount_cents,
            version = version + 1
      WHERE id = $1 AND state = ANY($3) AND version = $4
  RETURNING provider_charge_id, amount_cents\`,
    [paymentId, t.to, t.from, seenVersion]
  );
  if (rows.length === 0) throw new IllegalTransition("refund", paymentId);

  await provider.refund(rows[0].provider_charge_id, rows[0].amount_cents);
}

// In the schema:
// CHECK (refunded_cents <= amount_cents)`,
};

export default function Page() {
  return (
    <MoneyShell slug="state-machine">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="Two handlers, one $49 payment each, every button hits both. Walk it through its life, then do what happened in production: two people press Refund at the same moment."
        plainLede="Two shops, the same $49 payment. Every button presses on both. Try to make the careless one send back money it never took. Two agents clicking Refund in the same second is how it happens for real."
      >
        <StateMachineDemo />
      </Section>

      <Section n="02" title="What the guarded side has" plainTitle="What the careful side has">
        <Points
          items={[
            {
              title: "A transition table",
              plainTitle: "A rulebook",
              body: (
                <>
                  One object that says which action is legal from which state. The UPDATE carries it as <span className="font-mono text-sm">state = ANY($from)</span>.
                  Nothing else in the codebase decides what a payment can do next.
                </>
              ),
              plainBody: "One list that says which button is allowed at which stage. Refund is allowed after the money was taken, not before, and not twice.",
            },
            {
              title: "A version column",
              plainTitle: "A change counter",
              body: "Every write bumps it and every write names the version it saw. Two writers with the same version: the second one gets zero rows. No lock held across a network call, no retry storm.",
              plainBody:
                "Every change bumps a counter and says which number it saw. Two people press Refund together: the first bumps the counter, the second's number is out of date, the second gets nothing.",
            },
            {
              title: "Claim before you call",
              plainTitle: "Write it down, then phone the bank",
              body: (
                <>
                  The row moves to <span className="font-mono text-sm">refunded</span>{" "}first, the provider is called second. If the call fails, a job rolls the row back
                  or retries with the same idempotency key. Calling first and writing second is how you refund twice.
                </>
              ),
              plainBody: "Mark the payment refunded first, then ask the card company to send the money. If that call fails, undo the mark. The other way round is how refunds go out twice.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the handlers behind the buttons. The provider call is a stand-in; there is no provider in the lab." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version overwrites the status with whatever was asked. The good version changes it only if the current stage allows that move and nobody else changed the payment since it last looked.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why not just lock the row?" plain="Why not make the second person wait in line?" />}>
            <p>
              <T
                tech="A row lock held across the provider call is a lock held across the network. Timeouts queue up behind it. An optimistic version check plus an idempotent provider call fails fast instead."
                plain="You could, but the line would be waiting on a phone call to the card company. The counter lets the second click fail instantly instead of queueing."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What does the second person see?" plain="What does the second person see?" />}>
            <p>
              <T
                tech="409 with the current state in the body. The UI refreshes to 'refunded'. Nothing was sent to the provider twice."
                plain="A message: 'this payment was already refunded a moment ago'. Nothing goes out twice."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Where does the CHECK constraint come in?" plain="What is the database's own rule here?" />}>
            <p>
              <T
                tech="CHECK (refunded_cents <= amount_cents) is the last line of defence. Even if the application code is wrong, the row cannot hold a refund larger than the payment."
                plain="Refunds can never add up to more than the payment. Even buggy code cannot break that one, because the database refuses to save it."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is the transition table enough on its own?" plain="Is the rulebook enough on its own?" />}>
            <p>
              <T
                tech="No. Without the version, two writers both read 'captured', both pass the table check, both write. The table says what is legal; the version says who was first."
                plain="No. Two people can both look at the rulebook, both see 'refund allowed', and both act. The counter settles who was first."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </MoneyShell>
  );
}

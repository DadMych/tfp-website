import type { Metadata } from "next";
import MoneyShell from "@/components/lab/money/MoneyShell";
import WebhooksDemo from "@/components/lab/money/WebhooksDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webhooks — Money Lab",
  description: "Your own signed webhook inbox. Replay, out-of-order delivery, bad signatures. The handler stays correct, live against Postgres.",
  alternates: { canonical: "/lab/money/webhooks" },
};

const bad = {
  lang: "ts",
  filename: "handler-naive.ts",
  caption: "Trusts the sender, trusts the order of arrival, and processes a redelivery as a new event. Providers redeliver on every timeout. They say so in the docs.",
  code: `export async function POST(req) {
  const event = await req.json();

  if (event.type === "payment.captured") {
    await db.query(
      "UPDATE orders SET state = 'captured' WHERE id = $1",
      [event.order_id]
    );
    await fulfil(event.order_id);   // runs once per delivery, not once per event
  }
  return new Response("ok");
}`,
};

const good = {
  lang: "ts",
  filename: "handler.ts",
  caption: "Verify, claim the event id, move the order forward only if this event is newer. All three in the order shown. Dedupe and effect commit together.",
  code: `const raw = await req.text();
if (!verify(raw, req.headers.get("x-signature"))) return new Response(null, { status: 401 });
const ev = parse(raw);

await db.query("BEGIN");
const ins = await db.query(
  "INSERT INTO webhook_events (id, type, order_id, created_at) VALUES ($1,$2,$3,to_timestamp($4)) ON CONFLICT DO NOTHING RETURNING id",
  [ev.id, ev.type, ev.order_id, ev.created]
);
if (ins.rowCount === 0) { await db.query("ROLLBACK"); return json({ result: "duplicate" }); }

const upd = await db.query(
  \`INSERT INTO orders (id, state, last_event_at) VALUES ($1, $2, to_timestamp($3))
   ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, last_event_at = EXCLUDED.last_event_at
   WHERE orders.last_event_at < EXCLUDED.last_event_at
   RETURNING state\`,
  [ev.order_id, STATE[ev.type], ev.created]
);
await db.query("COMMIT");
return json({ result: upd.rowCount ? "processed" : "stale" });`,
};

export default function Page() {
  return (
    <MoneyShell slug="webhooks">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="A webhook is a POST from someone else's retry loop. It will arrive twice, late, out of order, and once from a stranger. Your inbox below runs the handler from section 03. Chaos sends all of it at once."
        plainLede="A webhook is the card company's messenger. It knocks twice when it is unsure, it arrives late, and sometimes someone knocks pretending to be it. Below is your own mailbox. Send it letters, or press Chaos and send everything at once."
      >
        <WebhooksDemo />
      </Section>

      <Section n="02" title="What the handler does" plainTitle="What the mailbox does">
        <Points
          items={[
            {
              title: "Verify first",
              plainTitle: "Check the signature first",
              body: "HMAC over the raw bytes, compared in constant time, before the body is parsed. Anything else is an open endpoint that marks orders paid.",
              plainBody:
                "Every real message carries a signature only the card company can produce. The mailbox checks it before reading a word. Without that, anyone could tell your shop an order is paid.",
            },
            {
              title: "Event id is the lock",
              plainTitle: "Every message has a number",
              body: "The event id is a primary key. Five parallel copies of the same event race to insert it; one wins, four get a conflict and answer 200 so the provider stops retrying. The effect and the dedupe row commit in one transaction, so a crash cannot leave one without the other.",
              plainBody:
                "The card company numbers its messages. The mailbox keeps every number it has seen. A repeat is thanked and ignored, even when five copies arrive in the same instant.",
            },
            {
              title: "Never move backwards",
              plainTitle: "Newer wins, old news is ignored",
              body: (
                <>
                  Arrival order means nothing. The provider&apos;s <span className="font-mono text-sm">created</span>{" "}timestamp does. An older event is recorded and
                  changes nothing. When the provider gives no usable order, fetch the object and apply its current state instead of the event.
                </>
              ),
              plainBody: "Messages can arrive in the wrong order. Each one says when it was written. An older message never overwrites a newer state of the order.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="The right side is the handler behind your inbox, trimmed. The left is what it replaced." plainLede="What the mailbox does, in one sentence. The code itself is one click away.">
        <TechOnly plain="Check the signature. Write the message number down once; if it is already there, say 'got it' and stop. Then move the order forward only if this message is newer than the last one.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why answer 200 to a duplicate instead of an error?" plain="Why say 'got it' to a repeat instead of 'error'?" />}>
            <p>
              <T
                tech="The provider retries on anything but 2xx. A 4xx on a duplicate means it keeps redelivering until the retry budget runs out, and your logs fill with noise that hides the real failures."
                plain="If the mailbox says 'error', the messenger comes back again and again. Saying 'got it' makes it stop."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What if the provider gives no usable timestamp?" plain="What if the messages do not say when they were written?" />}>
            <p>
              <T
                tech="Treat the event as a hint. Fetch the object from the provider's API and apply its current state. That is idempotent by construction and immune to ordering."
                plain="Then the message is only a nudge. The shop calls the card company and asks what the real state is right now."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Where does the signing secret live?" plain="Where is the secret kept?" />}>
            <p>
              <T
                tech="Environment or a secrets manager, rotated with a grace window where both keys verify. Never in the repository. The secret on this page is public on purpose: the inbox is yours alone and rate-limited."
                plain="In a safe place on the server, never inside the code. The secret shown on this page is public on purpose; your mailbox here is a toy."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why do the effect and the dedupe row commit together?" plain="Why write 'seen it' and do the work in one go?" />}>
            <p>
              <T
                tech="If the dedupe row commits and the handler crashes before the effect, that event is gone forever: the provider sees 200 and never resends. Commit both or neither, or write to an outbox and let a worker do the effect."
                plain="If the shop writes 'seen it' and then crashes before doing the work, that message is lost for good; the messenger will not come back. Write both down together, or neither."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </MoneyShell>
  );
}

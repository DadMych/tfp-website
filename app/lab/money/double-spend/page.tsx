import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import Link from "next/link";
import MoneyShell from "@/components/lab/money/MoneyShell";
import AttackConsole from "@/components/lab/money/AttackConsole";
import { T, Term, TechOnly } from "@/components/lab/money/Explain";
import { CodeCompare, Deep, Limits, Points, Section } from "@/components/lab/money/ui";
import { ATTACK, LEVELS } from "@/lib/lab/double-spend";
import { moneyLimits } from "@/lib/money-lab";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab/money/double-spend", "Double-Spend — Money Lab", "Attack a $100 balance with up to 200 parallel debits. Five defences, three of them leak money. Live against Postgres, every request timed.");

const bad = { lang: "ts", filename: "debit-check-in-code.ts", caption: LEVELS[1].hole, code: LEVELS[1].code };
const good = { lang: "ts", filename: "debit.ts", caption: LEVELS[4].hole, code: LEVELS[4].code };

export default function Page() {
  return (
    <MoneyShell slug="double-spend">
      <Section
        n="01"
        title="Attack"
        tone="tile"
        lede="Pick a defence. Press attack. Watch what a real Postgres does with a hundred payments, twenty in flight at a time."
        plainLede="Pick how the card is guarded. Press attack. Watch what happens when a hundred payments hit one card, twenty at a time."
      >
        <AttackConsole />
        <Limits>
          <T
            tech={`Limits: ${moneyLimits.dsRunsPerHour} attacks per hour per IP, ${ATTACK.requests.max} requests and ${ATTACK.concurrency.max} in flight per attack. Each attack has its own account row; rows older than 24 h are deleted. Timing is measured on the server with no added sleeps, so results vary run to run — that is the point.`}
            plain={`${moneyLimits.dsRunsPerHour} attacks an hour each. Everything is wiped after a day. The timings are real, so results change from run to run.`}
          />
        </Limits>
      </Section>

      <Section n="02" title="What holds" plainTitle="What keeps the card safe">
        <Points
          items={[
            {
              title: "Decide where the data is",
              plainTitle: "The database decides",
              body: "Read, decide in code, write: between the read and the write is a round trip, and every request that reads in that gap sees the old balance. No amount of care in the application code closes it.",
              plainBody: "If the app asks 'how much is there?' and then writes a new number, dozens of other payments ask the same question in between and get the same wrong answer.",
            },
            {
              title: "A lock in one process is not a lock",
              plainTitle: "One queue per copy is no queue",
              body: "An in-memory mutex passes every test on a laptop. Production runs two or more instances behind a load balancer, each with its own lock. Two queues, one balance. Half-fixed is not fixed.",
              plainBody: "Real services run several copies of the app at once. Each copy has its own queue and does not know the others exist. Two orderly queues, both spending the same card.",
            },
            {
              title: "Condition in the WHERE, CHECK behind it",
              plainTitle: "Check and pay in one step",
              body: "UPDATE … WHERE balance >= x: Postgres evaluates the condition under the row lock and writes or refuses in one round trip. CHECK (balance >= 0) stops the next fast path, admin tool or migration that forgets the WHERE.",
              plainBody: "The check and the payment are one single action that cannot be split, and it is the fastest safe option. The bank itself refuses to pay from an empty card, whatever new code gets written later.",
            },
          ]}
        />
      </Section>

      <Section
        n="03"
        title="The code"
        lede="Level 1 and Level 4 from the console, as the server runs them. The other levels are in the console under 'The code'."
        plainLede="What runs behind the attack button, in one sentence. The code itself is one click away."
      >
        <TechOnly plain="The bad version reads the balance, decides in the app, then writes a new number. The good version asks the database to take the money only if it is there, in one step.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions the console raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why does one round trip of gap lose money?" plain="Why does a tiny delay lose money?" />}>
            <p>
              <T
                tech={
                  <>
                    Level 1 does <span className="font-mono text-sm">SELECT</span>, decides in JavaScript, then <span className="font-mono text-sm">UPDATE</span>.
                    Between the two is a <Term k="round_trip">round trip</Term>{" "}to the database: a few milliseconds. In the timeline, every white tick is a
                    read. Count how many ticks sit to the left of the first bar&apos;s end: those requests all read {`$${ATTACK.startCents / 100}`}, all passed the check,
                    and all wrote the same stale result.
                  </>
                }
                plain={
                  <>
                    The app asks the database &quot;how much is there?&quot;, gets an answer, thinks, then says &quot;write this new number&quot;. Thinking takes a
                    few thousandths of a second. In that time dozens of other requests asked the same question and got the same, now wrong, answer.
                  </>
                }
              />
            </p>
            <p>
              <T
                tech="There is no amount of care in the application code that closes this. The decision has to happen where the data is."
                plain="You cannot fix this by being careful in the app. The only place that knows the true number at the moment of writing is the database itself."
              />
            </p>
          </Deep>

          <Deep q={<T tech="Level 2 has a lock. Why does it still leak?" plain="Defence 2 has a queue. Why does it still lose money?" />}>
            <p>
              <T
                tech={
                  <>
                    The lock is an <Term k="in_memory_lock">in-memory mutex</Term>. It serializes requests inside one process perfectly, which is why it passes
                    every test on a laptop. Production runs two or more instances behind a <Term k="load_balancer">load balancer</Term>. Each instance has its
                    own lock. The lab simulates exactly that: requests alternate between two lock maps. Two queues, one balance.
                  </>
                }
                plain={
                  <>
                    The queue lives inside one copy of the app. Real services run several copies at once so they can handle traffic. Each copy has its own
                    queue and does not know the others exist. Two orderly queues, both spending the same card.
                  </>
                }
              />
            </p>
            <p>
              <T
                tech="Watch the extracted number: it is roughly half of Level 1, because half the overlap is gone. Half-fixed is not fixed."
                plain="Your take is roughly half of what defence 1 gave you. Half the hole is closed. The shop still loses money."
              />
            </p>
          </Deep>

          <Deep q={<T tech="Level 3 and Level 4 both hold. Why ship Level 4?" plain="Defences 3 and 4 both hold. Why pick 4?" />}>
            <p>
              <T
                tech={
                  <>
                    Level 3 takes a <Term k="row_lock">row lock</Term> with <span className="font-mono text-sm">SELECT … FOR UPDATE</span>{" "}inside a{" "}
                    <Term k="transaction">transaction</Term>, decides in code, writes, commits. Three round trips while holding the lock. Every other request
                    waits. Correct, and you can see the cost: compare the total duration against Level 4 with the same knobs.
                  </>
                }
                plain={
                  <>
                    Defence 3 makes the bank take one payment at a time. Nobody is served until the one in front is done. Safe, and slow at rush hour. Run both with the same
                    settings and compare the time in the verdict.
                  </>
                }
              />
            </p>
            <p>
              <T
                tech={
                  <>
                    Level 4 puts the condition in the <span className="font-mono text-sm">WHERE</span>. Postgres takes the row lock, evaluates{" "}
                    <span className="font-mono text-sm">balance_cents &gt;= x</span>{" "}against the committed value, writes or matches zero rows. One statement, one
                    round trip, no window. Use Level 3 when you need the old value in application code for something else; otherwise Level 4.
                  </>
                }
                plain="Defence 4 makes the check and the payment one single action that cannot be split. It is also the fastest safe option, so there is no trade-off to argue about."
              />
            </p>
          </Deep>

          <Deep q={<T tech="What is the CHECK constraint for, if the WHERE already works?" plain="Why a rule in the bank, if the check already works?" />}>
            <p>
              <T
                tech={
                  <>
                    The <Term k="check">CHECK</Term> is for the next engineer. Someone will add a &quot;fast path&quot;, an admin tool, a migration script, a
                    second service writing to the same table. <span className="font-mono text-sm">CHECK (balance_cents &gt;= 0)</span>{" "}refuses all of them. In the
                    timeline a yellow bar is a request the schema stopped after the code let it through.
                  </>
                }
                plain="The rule lives in the bank, not in the shop's code. New staff, new tools, new mistakes: the bank still refuses to pay from an empty card."
              />
            </p>
          </Deep>

          <Deep q="How is “extracted” calculated, exactly?">
            <p>
              <span className="font-mono text-sm">extracted = approved × amount − clamp(start − final, 0, start)</span>
            </p>
            <p>
              <T
                tech="The second term is how much of the spend the balance actually funded. If the balance ended at −$400, it funded $100 and the rest is phantom. If a stale write left it at $25, it funded $75. Approved count and final balance come from the database, not from the client."
                plain="Take everything that was approved, subtract what the card really paid for, and what is left is money that came from nowhere. Both numbers come from the database, so the score cannot be inflated from the browser."
              />
            </p>
          </Deep>

          <Deep q="Is this the bug from the crypto card case?">
            <p>
              <T
                tech="Same class of bug. Balance checks in application code that did not hold under concurrent load. The case page has what I can say about it."
                plain="Yes, the same kind. The case page has the story, within what I am allowed to share."
              />{" "}
              <Link href="/work/crypto-card" className="underline decoration-[2px] underline-offset-4 hover:bg-brutal-yellow">
                Read the case →
              </Link>
            </p>
          </Deep>
        </div>
      </Section>
    </MoneyShell>
  );
}

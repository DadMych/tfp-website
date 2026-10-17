import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import MoneyShell from "@/components/lab/money/MoneyShell";
import MoneyMathDemo from "@/components/lab/money/MoneyMathDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const metadata: Metadata = labMeta("/lab/money/money-math", "Money Math — Money Lab", "Floats, splits, minor units and fee rounding. Runs in your browser.");

const bad = {
  lang: "ts",
  filename: "money-as-float.ts",
  caption: "Reads fine. Three of these four lines are wrong for at least one currency or one input.",
  code: `const price = 19.99;
const total = price * qty;                  // 59.97000000000001
const share = Math.round(total / 3 * 100) / 100;
const minor = Math.round(total * 100);     // JPY: 100× too much
await stripe.charges.create({ amount: minor });`,
};

const good = {
  lang: "ts",
  filename: "money-as-integer.ts",
  caption: "Integers in, integers through, formatting at the very edge. The two helpers below are the whole module.",
  code: `type Money = { minor: bigint; currency: string };

export function split(total: bigint, parts: number): bigint[] {
  const base = total / BigInt(parts);
  let rem = total - base * BigInt(parts);
  return Array.from({ length: parts }, () => base + (rem-- > 0n ? 1n : 0n));
}

export function minorDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency })
    .resolvedOptions().maximumFractionDigits;      // USD 2, JPY 0, KWD 3
}

// Postgres: amount_minor BIGINT NOT NULL, currency CHAR(3) NOT NULL
// Never NUMERIC with implicit scale, never FLOAT, never "decimal in the ORM".`,
};

export default function Page() {
  return (
    <MoneyShell slug="money-math">
      <Section
        n="01"
        tone="tile"
        title="Try it"
        lede="Four small calculators. Each one is a common money bug, reduced to the two lines that matter."
        plainLede="Four small calculators. Each one is a mistake that looks fine on a single payment and costs real money over a month."
      >
        <MoneyMathDemo />
      </Section>

      <Section n="02" title="The rules I actually use" plainTitle="The three rules">
        <Points
          items={[
            {
              title: "Integers, smallest unit",
              plainTitle: "Whole numbers, smallest coin",
              body: (
                <>
                  <span className="font-mono text-sm">BIGINT</span> plus a currency code, everywhere. Not <span className="font-mono text-sm">NUMERIC</span>{" "}with a scale
                  someone will change, not a decimal type in the ORM that converts to float on the way out.
                </>
              ),
              plainBody: "Store 4999, not 49.99, and always remember the currency. No decimals anywhere in the database.",
            },
            {
              title: "Round once, on purpose",
              body: "Rounding is a business decision: where, which direction, who gets the remainder. Write it down, do it in exactly one function, store the result. A report that recomputes a fee is a report that will disagree with the invoice.",
              plainBody: "Where you round, which way, and who gets the leftover cent is a business decision. Write it down, do it in one place, store the result.",
            },
            {
              title: "Format at the edge",
              plainTitle: "Add the dot at the very end",
              body: (
                <>
                  <span className="font-mono text-sm">Intl.NumberFormat</span>{" "}knows the minor unit digits, the symbol and the locale. The database does not need to.
                  Parsing user input goes the other way: string to integer, with a regex, no <span className="font-mono text-sm">parseFloat</span>.
                </>
              ),
              plainBody: "The number becomes '$49.99' only when a person is about to see it. Typing goes the other way: text straight to whole cents.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" plainLede="What the two versions do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version does arithmetic on decimals and converts for the card company at the end. The good version counts in whole numbers from start to finish and adds the dot only for display.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why not NUMERIC or DECIMAL in the database?" plain="Can't the database just store decimals exactly?" />}>
            <p>
              <T
                tech="NUMERIC is exact and fine for storage. The problem is everything around it: ORMs that hydrate to float, JSON that has no decimal type, languages whose default number is a double. BIGINT minor units survive every hop."
                plain="It can. The trouble is every other piece of software between the database and the screen, which turns decimals back into approximations. Whole numbers survive the trip."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Who gets the leftover cent?" plain="Who gets the leftover cent?" />}>
            <p>
              <T
                tech="Largest remainder: floor for everyone, then +1 to the first k parts by index, or by remainder size if the spec says so. Deterministic and documented, so payout files and invoices agree."
                plain="Whoever the rule says. The rule matters less than having one and applying it the same way everywhere."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is it ever OK to use floats for money?" plain="Is it ever fine to use decimals?" />}>
            <p>
              <T
                tech="For display-only estimates, charts and maths that is never stored or compared. Never for a value that will be summed, reconciled against a bank, or sent to a provider."
                plain="For a chart or a rough estimate, yes. For anything that will be added up, compared with the bank, or sent to the card company, no."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What does a payment provider actually expect?" plain="What does the card company want to receive?" />}>
            <p>
              <T
                tech="Minor units as an integer plus an ISO 4217 currency code. Stripe, Adyen and Checkout all do. If your core model already matches, there is no conversion left to get wrong."
                plain="Whole numbers in the smallest unit, plus the currency. If your own system counts the same way, there is nothing to convert and nothing to get wrong."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </MoneyShell>
  );
}

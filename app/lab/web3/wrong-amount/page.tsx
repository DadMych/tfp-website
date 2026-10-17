import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import W3Shell from "@/components/lab/web3/W3Shell";
import WrongAmountDemo from "@/components/lab/web3/WrongAmountDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/web3/wrong-amount",
  "Wrong Amount — Web3 Lab",
  "A fee taken on the way, a payment in two parts, a rounded-up transfer. Match by amount and real USDC lands on no invoice. A ledger per invoice books every cent."
);

const bad = {
  lang: "ts",
  filename: "match-careless.ts",
  caption: "One deposit, one invoice, matched by the number. Two parts never match, a short payment never matches, and the extra on an overpayment is simply not written anywhere.",
  code: `for (const d of newDeposits) {
  const inv = openInvoices.find((i) => d.amount >= i.amount);
  if (inv) await markPaid(inv);
  // else: nothing. The money is in the wallet and in no book.
}`,
};

const good = {
  lang: "ts",
  filename: "match-ledger.ts",
  caption: "Every deposit is a line on the invoice it was meant for (one deposit address per invoice). The state is a sum, so partial, short and over all have a name and a next step.",
  code: `await db.query(
  "INSERT INTO invoice_lines (invoice_id, tx_hash, amount) VALUES ($1, $2, $3)",
  [invoiceFor(d.to), d.hash, d.amount]   // UNIQUE (tx_hash)
);

const paid = await sumLines(invoice.id);
const state =
  paid === 0n            ? "unpaid"
  : paid < invoice.amount ? "partly"     // ask for the rest, or write off the fee
  : paid === invoice.amount ? "paid"
  :                         "overpaid";  // credit or refund the difference`,
};

export default function Page() {
  return (
    <W3Shell slug="wrong-amount">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="One invoice, four ways a real client pays it. Each button sends real transfers. Compare what each side has in its books once they settle."
        plainLede="One bill, four ways people actually pay it. Each button sends real test payments. Then compare what each checker wrote down."
      >
        <WrongAmountDemo />
      </Section>

      <Section n="02" title="Why the ledger wins" plainTitle="Why writing it all down wins">
        <Points
          items={[
            {
              title: "The chain doesn't know your invoice",
              plainTitle: "A payment has no memo",
              body: "A token transfer is from, to and an amount. No reference field, no partial-payment flag. Whatever links a deposit to an invoice is yours to build, and an amount is the weakest link there is.",
              plainBody: "A crypto payment says who, to whom and how much. Nothing says which bill it's for. Matching by amount is the weakest way to guess.",
            },
            {
              title: "Every cent gets a line",
              plainTitle: "Every payment gets a line",
              body: "Book deposits as lines, derive the invoice state from their sum. Short, split and over stop being 'unmatched funds' and become states with a next step: chase, write off, refund.",
              plainBody: "Write each payment down against its bill and add them up. 'Short', 'in two parts' and 'too much' become normal cases with a clear next step.",
            },
            {
              title: "Fees are a policy",
              plainTitle: "Small gaps need a rule",
              body: "Exchanges and bridges shave amounts. Decide up front what you accept: an exact match, a tolerance, or the gap as a line someone approves. Don't let the matcher decide by accident.",
              plainBody: "Fees shave a little off on the way. Decide in advance how much short is fine, instead of letting the code silently decide.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the matcher behind the demo." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version looks for one payment with the right number and ignores everything else. The good version writes every payment against its bill and lets the total say whether it's paid, short or too much.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why does the careless side say 'unpaid' after two parts?" plain="Why does the careless side still say 'unpaid'?" />}>
            <p>
              <T
                tech="Because it looks at each deposit alone: 3,000 is less than 5,800, and so is 2,800. Both arrived, neither matched, so the invoice stays open and the client gets a reminder for money they already sent."
                plain="It looks at each payment on its own. Neither half is enough, so it never says paid, and the client gets chased for money they already sent."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How does the careful side know which invoice a deposit is for?" plain="How does the careful side know which bill a payment is for?" />}>
            <p>
              <T
                tech="Here there is one invoice per visitor, so it's trivial. In production you give every invoice its own deposit address, derived from one key, so the address is the reference."
                plain="On this page there is only one bill. In real life every bill gets its own payment address, so the address says which bill it's for."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What about the 15 short?" plain="What happens to the 15 missing?" />}>
            <p>
              <T
                tech="The ledger doesn't decide, it shows. 'Partly paid, 15 due' goes to a person who either asks for it or writes it off as a fee line. Both leave a record; neither leaves an invoice that just says unpaid."
                plain="The careful side doesn't decide for you. Someone either asks the client for it or writes it off as a fee, and either way it's written down."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </W3Shell>
  );
}

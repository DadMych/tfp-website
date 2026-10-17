import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import W3Shell from "@/components/lab/web3/W3Shell";
import WhichInvoiceDemo from "@/components/lab/web3/WhichInvoiceDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/web3/which-invoice",
  "Which Invoice? — Web3 Lab",
  "Two clients owe the same USDC amount and one pays. A shared address matched by amount closes the wrong invoice. One derived address per invoice can't."
);

const bad = {
  lang: "ts",
  filename: "shared-address.ts",
  caption: "Everything lands on one address, so the amount is the only clue. Two invoices for the same amount and the first one in the list wins.",
  code: `// every invoice says: pay to STUDIO_ADDRESS
for (const d of depositsTo(STUDIO_ADDRESS)) {
  const inv = openInvoices.find((i) => i.amount === d.amount);
  if (inv) await markPaid(inv, d);   // first match, whoever sent it
}`,
};

const good = {
  lang: "ts",
  filename: "per-invoice.ts",
  caption: "Each invoice gets the next child address of one HD key. The address is the reference, so the amount only has to be checked, not guessed from.",
  code: `// creating an invoice
const index = await nextAddressIndex();
const address = hdKeyToAccount(root, { addressIndex: index }).address;
await saveInvoice({ amount, address, index });

// a deposit arrives
const inv = await invoiceByAddress(d.to);
if (inv) await addLine(inv, d);      // amounts: see Wrong Amount`,
};

export default function Page() {
  return (
    <W3Shell slug="which-invoice">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="Two clients, two invoices for the same amount. Pay one of them for real, then compare which invoice each book closed."
        plainLede="Two clients each owe the same amount. Make one of them pay, then see which bill each side marks as paid."
      >
        <WhichInvoiceDemo />
      </Section>

      <Section n="02" title="Why one address per invoice wins" plainTitle="Why every bill gets its own address">
        <Points
          items={[
            {
              title: "Amounts collide",
              plainTitle: "Same price, same number",
              body: "Retainers, plans and price lists mean many clients owe exactly the same amount. With one address, two of them paying in the same week is enough to book one payment against the wrong invoice.",
              plainBody: "Lots of clients owe exactly the same amount. If all payments land in one place, two of them paying the same week is enough for a mix-up.",
            },
            {
              title: "The sender doesn't help",
              plainTitle: "Who sent it isn't a clue",
              body: "Matching by the from-address breaks as soon as a client pays from an exchange: thousands of customers share that hot wallet, and the same client pays from a different one next month.",
              plainBody: "Many clients pay from an exchange, where thousands of people share one sending address. The sender tells you nothing.",
            },
            {
              title: "Addresses are free",
              plainTitle: "Addresses cost nothing",
              body: "An HD key derives as many addresses as you have invoices, offline, with no transaction. Only the studio key can spend from any of them.",
              plainBody: "One secret key can make a new address for every bill, for free. Only the studio can move money out of any of them.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the matcher behind the demo." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version sends every client to one address and guesses the bill from the amount. The good version gives each bill its own address, so a payment's address says which bill it is.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Is the careless book reading different transfers?" plain="Does the careless side see different payments?" />}>
            <p>
              <T
                tech="No. Both books read the same real transfers. The careless one ignores which address each hit, which is exactly what it would see if every invoice shared one address: an amount and nothing else."
                plain="No, the same real payments. The careless side just ignores where each one landed, as if every bill shared one address."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What does one address per invoice cost?" plain="What's the catch?" />}>
            <p>
              <T
                tech="The money is spread over many addresses. Moving it to one treasury is a transfer per address, and each needs gas, which on a token like USDC means first sending a little ETH to that address. Sweep in batches, when gas is cheap, or use a contract that forwards on arrival."
                plain="The money ends up spread over many addresses, and gathering it costs a small network fee for each. You do it in batches, when fees are low."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why not a payment reference, like a bank transfer?" plain="Why not a reference number, like at the bank?" />}>
            <p>
              <T
                tech="A plain ERC-20 transfer has no memo field. Some chains and payment processors add one, but every client then has to fill it in correctly, and some won't. An address can't be mistyped into another invoice's."
                plain="A crypto payment has no box for a reference. Even where there is one, people forget to fill it in. A bill's own address can't be forgotten."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </W3Shell>
  );
}

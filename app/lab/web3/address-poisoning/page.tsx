import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import W3Shell from "@/components/lab/web3/W3Shell";
import PoisonDemo from "@/components/lab/web3/PoisonDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/web3/address-poisoning",
  "Address Poisoning — Web3 Lab",
  "Copy a freelancer's address from a wallet history an attacker has salted with look-alikes. 30 seconds. Then see why payouts should never read history."
);

const bad = {
  lang: "ts",
  filename: "from-history.ts",
  caption: "Anyone can put a row in your history: a zero-value transferFrom, a fake token, a cent of dust. The newest look-alike wins.",
  code: `const last = history
  .filter(tx => tx.to.startsWith("0xBe9d") && tx.to.endsWith("9B2C"))
  .at(0);

await sendUsdc(last.to, amount);`,
};

const good = {
  lang: "ts",
  filename: "payee-list.ts",
  caption: "The address is entered once, from the freelancer's own invoice, and a second person confirms it. Payouts read the list, never history.",
  code: `const payee = await payees.get(freelancerId);
if (!payee.confirmedBy || payee.confirmedBy === payee.addedBy) {
  throw new Error("payee needs a second person's check");
}

await sendUsdc(payee.address, amount);`,
};

export default function Page() {
  return (
    <W3Shell slug="address-poisoning">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="Pay the freelancer again by copying their address from the studio wallet's history. Three rows were planted. You have 30 seconds."
        plainLede="Pay the freelancer again by copying their account number from past payments. A scammer slipped three fakes in. You have 30 seconds."
      >
        <PoisonDemo />
      </Section>

      <Section n="02" title="How the trap is set" plainTitle="How the trick works">
        <Points
          items={[
            {
              title: "History is writable by strangers",
              plainTitle: "Anyone can add to your list",
              body: "A token's transferFrom with a value of 0 needs no allowance, so an attacker can make your wallet appear to have sent 0 USDC to their address. Fake tokens and a cent of dust do the same from the other side.",
              plainBody: "A scammer can make a fake payment show up in your list without touching your money: one for 0, one in made-up coins, or a tiny gift.",
            },
            {
              title: "People read the ends",
              plainTitle: "We only check the ends",
              body: "Wallets shorten addresses to 0xBe9d…9B2C, and people compare the part they can see. Generating an address with the same first and last four characters takes a GPU a few hours.",
              plainBody: "Apps shorten the number to its start and end, so that's all anyone checks. A computer can make a matching one in a few hours.",
            },
            {
              title: "A transfer can't be undone",
              plainTitle: "There's no taking it back",
              body: "No chargeback, no bank to call. Once the payout lands on the look-alike, the only question is whether the attacker answers email.",
              plainBody: "No bank to call, no refund. Once the money lands on the wrong number, it's gone.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="The two payout paths behind the demo." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version copies the number from past payments. The good version uses a number that was saved once and checked by a second person.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Is any of this on chain?" plain="Is any of this real?" />}>
            <p>
              <T
                tech="No. This chapter is a simulator: the look-alike addresses are random strings with the right ends, not ground keys, and no dust or zero-value transfers are sent. The freelancer's address is the same real Sepolia address as in Paid Twice."
                plain="No. This one is a simulation: nobody is sent fake payments, and the look-alike numbers are just made up to match. The freelancer's number is the same one used in Paid Twice."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why not just compare the full address?" plain="Why not just check the whole number?" />}>
            <p>
              <T
                tech="Do, but don't rely on it. People check 42 characters badly, especially at the end of a long payout run. A payee list moves the check to one moment with two people, instead of every payout with one."
                plain="You should, but people are bad at checking 42 characters, especially when tired. Saving it once and checking it with two people is safer than checking it alone every time."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What about address books in wallets?" plain="What about saved contacts in a wallet app?" />}>
            <p>
              <T
                tech="Same idea, and better than history. The part that matters is where the address came from when it was saved: the freelancer's own invoice or a signed message, not a copy from a block explorer."
                plain="Same idea, and much better than past payments. What matters is where the number came from when you saved it: from the freelancer directly, not from your history."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </W3Shell>
  );
}

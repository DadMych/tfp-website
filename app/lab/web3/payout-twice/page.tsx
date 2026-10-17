import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import W3Shell from "@/components/lab/web3/W3Shell";
import PayoutDemo from "@/components/lab/web3/PayoutDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/web3/payout-twice",
  "Paid Twice — Web3 Lab",
  "A USDC payout whose reply is lost. Retry by sending again: two real transfers on Sepolia. Retry by rebroadcasting the stored signed transaction: one."
);

const bad = {
  lang: "ts",
  filename: "payout-careless.ts",
  caption: "A timeout says nothing about whether the transfer went out. Sending again builds a new transaction with the next nonce, and the chain happily runs both.",
  code: `try {
  await wallet.writeContract({ ...transfer(to, amount) });
} catch (err) {
  if (isTimeout(err)) {
    // "it failed, try again"
    await wallet.writeContract({ ...transfer(to, amount) });
  }
}`,
};

const good = {
  lang: "ts",
  filename: "payout-careful.ts",
  caption: "The nonce is the idempotency key. Sign once, store the bytes and the hash before sending, and every retry sends exactly those bytes. At most one of them can ever be mined.",
  code: `const req = await wallet.prepareTransactionRequest({ to: USDC, data, nonce });
const raw = await wallet.signTransaction(req);
await db.payouts.insert({ id, nonce, raw, hash: keccak256(raw) });

await send(raw);              // timeout? fine.
// retry, any time, any number of times:
await send(raw);              // "already known" or the same hash`,
};

export default function Page() {
  return (
    <W3Shell slug="payout-twice">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="The studio pays a freelancer. The node's reply is dropped on purpose, and each side retries the way its code says. Then compare the hashes."
        plainLede="The studio pays a freelancer and never hears back. Each side tries again its own way. Then see what the freelancer actually got."
      >
        <PayoutDemo />
      </Section>

      <Section n="02" title="Why rebroadcasting wins" plainTitle="Why sending the same payment wins">
        <Points
          items={[
            {
              title: "A timeout is not a failure",
              plainTitle: "No reply isn't a no",
              body: "The node may have taken the transaction and gossiped it to the network before the reply was lost. From your side, 'it failed' and 'it worked, you just didn't hear' look identical.",
              plainBody: "The payment may have gone out and only the answer got lost. From your side, 'it failed' and 'it worked' look exactly the same.",
            },
            {
              title: "The nonce is the key",
              plainTitle: "Each payment has a number",
              body: "An account's transactions are numbered. Two transactions with the same nonce can't both be mined, so a stored signed transaction is a perfect idempotency key: resend it as often as you like.",
              plainBody: "Every payment from a wallet gets a number, and only one payment per number can ever go through. Re-sending the same saved payment can't pay twice.",
            },
            {
              title: "Store before you send",
              plainTitle: "Save first, send second",
              body: "If you only learn the hash from the send call's reply, a lost reply leaves you with nothing to look up. Sign, store, then send: the hash exists before the network does anything.",
              plainBody: "Write the payment down before sending it. Then a lost reply never leaves you guessing: you know exactly what to look for.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the payout handler behind the demo." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version makes a brand-new payment when it hears nothing back. The good version saves the signed payment first and, when it hears nothing, sends that same payment again.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Is the lost reply real?" plain="Is the lost reply real?" />}>
            <p>
              <T
                tech="The timeout is injected: the lab ignores the node's answer on the first send, on both sides. Everything after that is real: the careless retry is a new signed transaction with the next nonce, and both appear on Etherscan."
                plain="The lost reply is staged: the lab ignores the first answer on purpose. Everything after that really happens on the test network, and you can check it on the explorer."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What if the stored transaction never gets mined?" plain="What if the saved payment never goes through?" />}>
            <p>
              <T
                tech="Then it's stuck, usually on a low fee. You replace it with a new transaction with the same nonce and a higher fee. Only one of the two can be mined, so even the replacement can't double-pay."
                plain="Then you replace it with a new payment that has the same number and a higher fee. Only one of them can go through, so even that can't pay twice."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Isn't this the same as idempotency keys in Part 2?" plain="Isn't this like the retry problem in Part 2?" />}>
            <p>
              <T
                tech="Same problem, different key. In Part 2 the database refuses a second charge with the same idempotency key. On a chain, the nonce plays that role, but only if you reuse the transaction instead of building a new one."
                plain="Same problem. In Part 2 the database refuses a repeat. On a blockchain, the payment's number does that job, but only if you resend the same payment."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </W3Shell>
  );
}

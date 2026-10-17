import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import W3Shell from "@/components/lab/web3/W3Shell";
import FakeUsdcDemo from "@/components/lab/web3/FakeUsdcDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/web3/fake-usdc",
  "Fake USDC — Web3 Lab",
  "I deployed my own \"USD Coin\" on Sepolia. A deposit watcher that checks the symbol books it as payment. One that checks the contract address doesn't."
);

const bad = {
  lang: "ts",
  filename: "symbol-check.ts",
  caption: "name(), symbol() and decimals() are whatever the deployer wrote. My fake returns exactly what Circle's does.",
  code: `for (const log of receipt.logs) {
  const t = decodeTransfer(log);
  if (!t || t.to !== invoice.address) continue;
  const symbol = await readContract({ address: log.address, functionName: "symbol" });
  if (symbol === "USDC") credit(invoice, t.value);
}`,
};

const good = {
  lang: "ts",
  filename: "address-check.ts",
  caption: "A token is its contract address on one chain. Pin the address per chain in config; everything else is a label.",
  code: `const USDC = { 11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" } as const;

for (const log of receipt.logs) {
  const t = decodeTransfer(log);
  if (!t || t.to !== invoice.address) continue;
  if (isAddressEqual(log.address, USDC[chainId])) credit(invoice, t.value);
  else flagForReview(invoice, log.address, t.value);
}`,
};

export default function Page() {
  return (
    <W3Shell slug="fake-usdc">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="One invoice, two ways to pay it: Circle's USDC, or a token I deployed with the same name, symbol and decimals. Both transfers are real."
        plainLede="One bill, two ways to pay: Circle's digital dollar, or a copy I made and gave the same name. Both payments really happen."
      >
        <FakeUsdcDemo />
      </Section>

      <Section n="02" title="Why the symbol proves nothing" plainTitle="Why the name proves nothing">
        <Points
          items={[
            {
              title: "Symbols aren't unique",
              plainTitle: "Anyone can use the name",
              body: "An ERC-20's name and symbol are two strings its deployer picks. There is no registry: deploying 'USD Coin / USDC' took one transaction and a few cents of test gas.",
              plainBody: "A digital dollar's name is just text its maker typed in. Nobody checks it. Making ours took one step and cost almost nothing.",
            },
            {
              title: "The address is the token",
              plainTitle: "Who issued it is what counts",
              body: "Circle's USDC is one contract address per chain. A Transfer event carries the address of the contract that emitted it; that, plus the chain id, is the only thing worth comparing.",
              plainBody: "Real USDC comes from one place that Circle runs. Every payment shows where it came from, and that's the only part you should check.",
            },
            {
              title: "Fake coins still show up",
              plainTitle: "Fakes look real in a wallet",
              body: "The fake transfer is a real on-chain event: wallets and explorers list it as 5,800 USDC. Ignoring it isn't enough; flag unknown tokens to an invoice address for a person to look at.",
              plainBody: "The fake payment really arrives and many apps show it as 5,800 USDC. Don't just skip it: someone should look at who sent it.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the deposit watcher behind the demo." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version believes the label on the coin. The good version checks that the coin came from Circle, and sets anything else aside for a person.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Is the fake token real?" plain="Is the fake money real?" />}>
            <p>
              <T
                tech="Yes, on Sepolia only. It's a plain ERC-20 I deployed, named USD Coin, symbol USDC, 6 decimals, and its notice() says it isn't Circle's. The lab holds the whole supply and mints for free."
                plain="It really exists, on a test network only. I made it, can make more for free, and it says inside that it isn't Circle's."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Does this happen on mainnet?" plain="Does this happen with real money?" />}>
            <p>
              <T
                tech="Yes. Tokens copying USDC's name and symbol are cheap to deploy on any EVM chain and get sent to addresses that publish invoices. Bridged versions are a related trap: 'USDC.e' on one chain and native USDC are different contracts, and only one is the one you invoiced for."
                plain="Yes. Copies with the same name are cheap to make on any network and get sent to businesses that take crypto. Even some genuine-looking versions are different coins from the one you asked for."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why also check the chain id?" plain="Why check the network too?" />}>
            <p>
              <T
                tech="The same address can hold different code on different chains. An address is only USDC together with the chain it lives on, so the allow-list is keyed by chain id."
                plain="The same address can mean different things on different networks. The check has to know both."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </W3Shell>
  );
}

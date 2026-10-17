import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import W3Shell from "@/components/lab/web3/W3Shell";
import ConfirmationsDemo from "@/components/lab/web3/ConfirmationsDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/web3/confirmations",
  "Confirmations — Web3 Lab",
  "A USDC payment on Sepolia, watched two ways. One marks it paid at the first block, one waits and keeps checking. Then the block disappears."
);

const bad = {
  lang: "ts",
  filename: "watch-careless.ts",
  caption: "A receipt means the transfer is in a block. It doesn't mean the block will stay. This code never asks again.",
  code: `const receipt = await client.getTransactionReceipt({ hash });
if (receipt.status === "success") {
  await markPaid(invoice);   // work goes out now
}`,
};

const good = {
  lang: "ts",
  filename: "watch-careful.ts",
  caption: "Credit only with N blocks on top, store the block hash you trusted, and on every look check that block is still the one at that height.",
  code: `const tip = await client.getBlockNumber();
const depth = tip - receipt.blockNumber + 1n;

if (!deposit.creditedHash && depth >= N) {
  await credit(invoice, receipt.blockHash);
}

// every time the watcher looks, even after crediting
const now = await client.getBlock({ blockNumber: receipt.blockNumber });
if (deposit.creditedHash && now.hash !== deposit.creditedHash) {
  await reverse(invoice);    // the chain changed under us
}`,
};

export default function Page() {
  return (
    <W3Shell slug="confirmations">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="One invoice, one real transfer, two watchers on the same chain. Pay, pick how long the careful one waits, then tear the block out."
        plainLede="One invoice, one real payment, two ways of checking it. Pay, then make the payment vanish and see which checker already handed over the work."
      >
        <ConfirmationsDemo />
      </Section>

      <Section n="02" title="Why waiting wins" plainTitle="Why waiting wins">
        <Points
          items={[
            {
              title: "In a block is not final",
              plainTitle: "Showing up isn't the end",
              body: "The newest blocks can be replaced when the network briefly disagrees about which block came next. A transfer in a replaced block is simply not in the chain anymore. Every block on top makes that less likely.",
              plainBody: "The newest part of the chain can still be swapped out. A payment in a swapped-out piece just isn't there anymore. Every new block on top makes that less likely.",
            },
            {
              title: "Remember what you trusted",
              plainTitle: "Write down what you checked",
              body: "Storing the block hash with the credit turns a reorg from a mystery into a comparison: is the block at that height still the one I credited against? Same check for a real reorg and for the simulated one here.",
              plainBody: "The careful checker writes down which block it saw the payment in. Later it just checks that block is still there. If it isn't, it knows right away.",
            },
            {
              title: "N is a business decision",
              plainTitle: "How long to wait is a money question",
              body: "More blocks, slower checkout, smaller risk. A coffee can ship at 1. A five-figure invoice waits, and on Ethereum the real line is finality, a couple of epochs later.",
              plainBody: "Waiting longer is safer but slower. A coffee can go out right away. A big invoice should wait.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the watcher behind the demo." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version says 'paid' as soon as the payment is in a block and never looks again. The good version waits for more blocks, writes down which block it trusted, and checks that block every time it looks.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Is the payment real?" plain="Is the payment real?" />}>
            <p>
              <T
                tech="Yes. Pay sends a real USDC transfer on Sepolia, Ethereum's test network, from a lab wallet to the studio's address. The link next to the block opens it on Etherscan. Test USDC is worth nothing, so a tiny amount stands in for the invoice."
                plain="Yes, on a test network where the money is worth nothing. The link next to the block opens the payment on a public explorer."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Then what is simulated?" plain="Then what is pretend?" />}>
            <p>
              <T
                tech="Only the tear-out. Sepolia doesn't reorg on request, so the button replaces your view of the chain from the deposit's block up with blocks that don't contain it. Both watchers read that view; neither knows it's simulated. The careful one catches it the same way it would catch a real reorg: the hash at that height changed."
                plain="Only the vanishing. The real network won't do it on request, so the button swaps the blocks on your screen. The checkers can't tell, and the careful one notices the same way it would in real life."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How often do real reorgs happen?" plain="Does this happen for real?" />}>
            <p>
              <T
                tech="On Ethereum since the move to proof of stake, one-block reorgs happen occasionally and deeper ones are rare. Finality, about two epochs, is the point after which a block can't be replaced without a huge, visible cost. Chains with faster blocks and weaker finality reorg more often."
                plain="Short swaps happen now and then on the main network, and deeper ones are rare. Other networks swap more often. After a few minutes, a block is effectively permanent."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why does the careful one sometimes credit and then reverse?" plain="Why did the careful one say 'paid' and then take it back?" />}>
            <p>
              <T
                tech="Because you set N lower than the depth you tore out. Waiting makes a reorg less likely, not impossible, so the watcher keeps checking after it credits. In a real system the reversal holds the order for a person instead of shipping."
                plain="Because you told it to wait fewer blocks than you then removed. Waiting makes this unlikely, not impossible, so it keeps checking even after saying 'paid'."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </W3Shell>
  );
}

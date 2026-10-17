import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import W3Shell from "@/components/lab/web3/W3Shell";
import StuckDemo from "@/components/lab/web3/StuckDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/web3/stuck-deposits",
  "Stuck Deposits — Web3 Lab",
  "Three real USDC deposits, a simulated provider that reports one on time, one late and one never. Trust the webhooks and you chase a paid client. Reconcile with the chain and you flag the provider."
);

const bad = {
  lang: "ts",
  filename: "webhook-only.ts",
  caption: "The provider is the only source of truth. A dropped webhook isn't an error anywhere: the invoice just stays unpaid.",
  code: `app.post("/webhooks/deposits", async (req) => {
  const e = verify(req);
  if (e.type === "deposit.confirmed") {
    await invoices.markPaid(e.invoiceId, e.amount);
  }
});
// and nothing else ever marks an invoice paid`,
};

const good = {
  lang: "ts",
  filename: "reconcile.ts",
  caption: "Webhooks are a fast path. The chain is the record. Every sync compares the two and turns any gap into a ticket.",
  code: `const onChain = await getLogs(USDC.Transfer, { to: openInvoiceAddresses, fromBlock });

for (const inv of openInvoices) {
  const tx = onChain.find(l => l.to === inv.address);
  if (!tx || confirmations(tx) < N) continue;
  await invoices.markPaid(inv.id, tx.value, { source: "chain", tx: tx.hash });
  if (!webhooks.has(tx.hash) && blocksSince(tx) > GRACE) {
    await tickets.open("provider", { invoice: inv.id, tx: tx.hash });
  }
}`,
};

export default function Page() {
  return (
    <W3Shell slug="stuck-deposits">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="Three clients pay three invoices for real. The deposit provider in the middle is simulated: one webhook on time, one late, one never."
        plainLede="Three clients pay three bills, for real. The service that reports payments is simulated: it reports one on time, one late, and forgets one."
      >
        <StuckDemo />
      </Section>

      <Section n="02" title="Why reconcile" plainTitle="Why check for yourself">
        <Points
          items={[
            {
              title: "Webhooks get lost",
              plainTitle: "Messages go missing",
              body: "Providers retry, but retries run out, endpoints time out, and a deploy at the wrong minute drops a batch. Nothing on your side fails: you just never hear about the deposit.",
              plainBody: "The service tries to tell you, but messages get lost. Nothing breaks on your side. You just never find out.",
            },
            {
              title: "The chain doesn't",
              plainTitle: "The payment record stays",
              body: "A confirmed transfer to the invoice's address is a public fact. Reading Transfer logs for your own addresses is one call per sync, and it doesn't depend on anyone remembering to tell you.",
              plainBody: "The payment itself is on a public record that anyone can check. Looking at it takes one quick step and needs nobody to remember to tell you.",
            },
            {
              title: "A gap is a ticket",
              plainTitle: "A gap is a question",
              body: "When the two disagree, the client isn't the one to chase. Credit from the chain, open a ticket with the provider, and keep the transaction hash on both.",
              plainBody: "When the service and the record disagree, don't chase the client. Mark it paid from the record and ask the service what happened.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the two booking paths behind the demo." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version only marks a bill paid when the service says so. The good version checks the payments itself every few seconds and asks the service about anything it missed.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="What is real here?" plain="What's real here?" />}>
            <p>
              <T
                tech="The three transfers and the careful side's chain read: it calls eth_getLogs for USDC Transfer events to the three invoice addresses, with no help from the lab's own send records. The provider and its webhooks are simulated, timed in blocks."
                plain="The payments are real, and so is the careful side's check: it reads them from the public record itself. The payment service and its messages are simulated."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why have a provider at all?" plain="Why use a payment service at all?" />}>
            <p>
              <T
                tech="Running nodes, watching many chains and sweeping deposit addresses is real work, and providers do it well most of the time. The point isn't to drop them; it's that their webhook is a notification, not the ledger."
                plain="Watching payments across many networks is real work, and these services usually do it well. Keep them. Just don't treat their message as the only proof."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What about the late one?" plain="What about the late one?" />}>
            <p>
              <T
                tech="B shows the other half: the careless book is right eventually, but in between it sent a reminder for money already received. The reconciled book credited B from the chain at the same block and only noted that the provider was late."
                plain="B shows the other problem: the careless side gets it right in the end, but first it chases a client who already paid. The careful side marked B paid straight away and only noted that the service was slow."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </W3Shell>
  );
}

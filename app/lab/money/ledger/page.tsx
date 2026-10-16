import type { Metadata } from "next";
import MoneyShell from "@/components/lab/money/MoneyShell";
import LedgerDemo from "@/components/lab/money/LedgerDemo";
import CodeSnippet from "@/components/work/CodeSnippet";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ledger — Money Lab",
  description: "Balances as numbers drift the first time a process dies between two updates. A double-entry ledger cannot. Live against Postgres.",
  alternates: { canonical: "/lab/money/ledger" },
};

const bad = {
  lang: "ts",
  filename: "transfer-naive.ts",
  caption: "Two statements, no transaction. The process dies between them once a month and nobody can say which transfer did it. Wrapping both in BEGIN/COMMIT fixes the crash, not the model.",
  code: `export async function pay(wallet: string, amount: number) {
  await db.query(
    "UPDATE balances SET amount = amount - $2 WHERE account = $1",
    [wallet, amount]
  );
  // ← deploy, OOM, timeout, pod eviction
  await db.query(
    "UPDATE balances SET amount = amount + $2 WHERE account = $1",
    ["revenue", amount]
  );
}`,
};

const good = {
  lang: "ts",
  filename: "transfer-ledger.ts",
  caption: "A balance is a query, not a column. Both legs commit together or not at all, and a deferred trigger refuses any transaction whose entries do not sum to zero.",
  code: `export async function pay(wallet: string, amount: number) {
  await db.query("BEGIN");
  const { rows: [{ tx_id }] } = await db.query(
    "INSERT INTO journal (memo) VALUES ($1) RETURNING tx_id", ["pay"]
  );
  await db.query(
    "INSERT INTO entries (tx_id, account, amount_cents) VALUES ($1, $2, $3), ($1, $4, $5)",
    [tx_id, wallet, +amount, "revenue", -amount]
  );
  await db.query("COMMIT");   // trigger runs here
}

// balance of any account, at any point in time:
// SELECT SUM(amount_cents) FROM entries WHERE account = $1 AND created_at <= $2`,
};

const trigger = {
  lang: "sql",
  filename: "0002_money_lab.sql",
  caption: "The invariant lives in the database, not in a code review. INITIALLY DEFERRED means it runs at COMMIT, after both legs are in.",
  code: `CREATE OR REPLACE FUNCTION lg.assert_balanced() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM lg.entries
     WHERE tx_id = COALESCE(NEW.tx_id, OLD.tx_id)
     GROUP BY tx_id HAVING SUM(amount_cents) <> 0
  ) THEN
    RAISE EXCEPTION 'ledger transaction does not sum to zero'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'lg_tx_balanced';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER lg_tx_balanced
  AFTER INSERT OR UPDATE OR DELETE ON lg.entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION lg.assert_balanced();`,
};

export default function Page() {
  return (
    <MoneyShell slug="ledger">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="Same three accounts, same buttons, two ways of keeping the books. Use the first three to see them agree. Use Chaos to see one of them stop agreeing."
        plainLede="Three accounts, two ways of writing things down. Every button moves the same money in both. 'Crash ×20' kills the process halfway through, twenty times. Watch which book stops adding up."
      >
        <LedgerDemo />
      </Section>

      <Section n="02" title="Why the ledger wins" plainTitle="Why the accountant's way wins">
        <Points
          items={[
            {
              title: "Append only",
              plainTitle: "Nothing is ever erased",
              body: "Nothing is ever updated. A mistake is a new transaction that reverses the old one. The history is the data, so \"what was the balance on the 3rd\" is a WHERE clause, not an archaeology project.",
              plainBody: "Mistakes are fixed by adding a reversing line, never by editing. The history is the data, so 'what was the balance on the 3rd' is a simple question.",
            },
            {
              title: "Every cent has two addresses",
              body: "Money does not appear or vanish; it moves from one account to another. If the sum of all entries is ever not zero, the ledger is corrupt and the trigger has made that impossible to commit.",
              plainBody: "Money never appears or vanishes. It moves from one account to another, and both sides are written. If the lines do not add up to zero, the database refuses to save them.",
            },
            {
              title: "Reconciliation becomes a diff",
              plainTitle: "Checking against the bank gets easy",
              body: "The bank statement is a list of movements. So is the ledger. Match them line by line and the gap is a list of transactions, not a number nobody can explain. Cache balances if you must, but derive them from entries, never the other way round.",
              plainBody: "The bank statement is a list of movements. So is the book. Put them side by side and the difference is a short list of transactions, not a mystery number.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the handler behind the buttons and from the migration that built the schema." plainLede="What runs behind the buttons, in one sentence. The code itself is one click away.">
        <TechOnly plain="The bad version updates two numbers in two separate steps. The good version writes two matching lines in one step, and a database rule rejects anything that does not add up to zero.">
          <div className="flex flex-col gap-8">
            <CodeCompare bad={bad} good={good} />
            <div className="lg:w-1/2 lg:ml-auto">
              <CodeSnippet snippet={trigger} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why does the balances table drift? Isn't that just a missing transaction?" plain="Why does the simple book drift at all?" />}>
            <p>
              <T
                tech="In the demo the two UPDATEs are deliberately not in one transaction, which is how a lot of real code is written: two ORM saves with a crash or timeout between them. Wrapping them fixes the drift but still gives you no history and no invariant to check."
                plain="Because the two updates are two separate saves. A crash between them leaves one done and one not. And even without crashes, a single number tells you nothing about how it got there."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Do I need a real accounting system?" plain="Do I need accounting software for this?" />}>
            <p>
              <T
                tech="No. Two tables: journal (id, memo, created_at) and entries (journal_id, account, amount). A deferred constraint trigger that checks SUM(amount) = 0 per journal at COMMIT. That is the whole thing."
                plain="No. Two tables and one rule. It is less code than most people expect."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Summing every entry for a balance: what about performance?" plain="Isn't adding up every line slow?" />}>
            <p>
              <T
                tech="Keep a balances table updated in the same transaction and recompute from entries on a schedule to prove it matches. Entries stay the source of truth; the balance is a cache."
                plain="You can keep a running total for speed, as long as the lines stay the truth and you check the total against them regularly."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What is 'post one leg' testing?" plain="What does 'write half a movement' test?" />}>
            <p>
              <T
                tech="That the invariant is enforced by Postgres, not by discipline. A transaction with a single entry is refused at COMMIT by the deferred trigger, no matter what the application code wanted."
                plain="That the database itself says no to a half-written movement, even when the code tries to save one."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </MoneyShell>
  );
}

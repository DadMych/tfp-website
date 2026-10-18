import { ProofLine, ProofPanel, type Stat } from "@/components/lab/PartCard";
import { aiCorpus } from "@/lib/ai-lab";
import { readCounters } from "@/lib/lab/counters";
import { formatCents } from "@/lib/money-lab";
import { EVALSET } from "@/lib/rag/evalset";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { latestScores } from "@/lib/rag/scores";

async function AiProof() {
  const scores = await latestScores().catch(() => []);
  const pct = (k: string) => {
    const a = scores.find((s) => s.config === k)?.answers;
    return a == null ? null : `${Math.round(a * 100)}%`;
  };
  const [quick, careful] = [pct(QUICK_KEY), pct(CAREFUL_KEY)];
  const stats: Stat[] = [
    ...(quick && careful ? [{ values: [quick, careful], label: "right answers, quick → careful" }] : []),
    { values: [String(aiCorpus.files)], label: `files · ${aiCorpus.languages} languages` },
    { values: [String(EVALSET.length)], label: "test questions" },
  ];
  return <ProofPanel stats={stats} />;
}

async function MoneyProof() {
  const c = await readCounters();
  const [attacks, taken, held] = [c.ds_attacks_total, c.ds_extracted_cents, c.ds_defended_extracted_cents ?? 0];
  if (!(attacks > 0 && taken > 0 && Number.isFinite(held))) return <ProofLine text="One $100 balance, up to 200 payments at once. See how much you can take." />;
  return (
    <ProofPanel
      stats={[
        { values: [`${attacks.toLocaleString("en-US")}×`], label: "visitors' attacks" },
        { values: [formatCents(taken)], label: "taken from the careless card" },
        { values: [formatCents(held)], label: "from the careful one" },
      ]}
    />
  );
}

/** Everything the careless books in Part 3 got wrong, in story USDC (1 test unit = 1 USDC). */
const W3_CARELESS = [
  "w3_careless_lost_units",
  "w3_careless_misattributed_units",
  "w3_careless_unmatched_units",
  "w3_careless_fake_units",
  "w3_careless_overpaid_units",
  "w3_careless_stuck_units",
];

async function Web3Proof() {
  const c = await readCounters();
  const transfers = c.w3_transfers_total ?? 0;
  const fakes = c.w3_fake_runs ?? 0;
  const careless = W3_CARELESS.reduce((s, k) => s + (c[k] ?? 0), 0);
  if (!(transfers > 0)) return <ProofLine text="Real USDC deposits on Sepolia, read straight from the chain. Seven ways to book them wrong." />;
  return (
    <ProofPanel
      stats={[
        { values: [transfers.toLocaleString("en-US")], label: "real payments on Sepolia" },
        { values: [fakes.toLocaleString("en-US")], label: "fake USDC payments caught" },
        { values: [careless.toLocaleString("en-US")], label: "USDC the careless books got wrong" },
      ]}
    />
  );
}

/** Live numbers for each Part, by lab-config slug. Async: wrap in Suspense. */
export const PART_PROOF: Record<string, React.ReactNode> = {
  ai: <AiProof />,
  money: <MoneyProof />,
  web3: <Web3Proof />,
};

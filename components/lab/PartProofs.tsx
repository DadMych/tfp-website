import { cache, Suspense } from "react";
import { ProofLine, ProofPanel, TileSkeleton, TileStat, type Stat } from "@/components/lab/PartCard";
import { aiCorpus } from "@/lib/ai-lab";
import { readCounters } from "@/lib/lab/counters";
import { formatCents } from "@/lib/money-lab";
import { EVALSET } from "@/lib/rag/evalset";
import { CAREFUL_KEY, QUICK_KEY } from "@/lib/rag/presets";
import { latestScores } from "@/lib/rag/scores";
import { COUNTS, FINDINGS } from "@/lib/audit/findings";

const counters = cache(readCounters);
const scores = cache(() => latestScores().catch(() => []));

/** Right answers of the quick and the careful build, or null before the first graded run. */
async function aiPair(): Promise<[string, string] | null> {
  const s = await scores();
  const pct = (k: string) => {
    const a = s.find((x) => x.config === k)?.answers;
    return a == null ? null : `${Math.round(a * 100)}%`;
  };
  const [quick, careful] = [pct(QUICK_KEY), pct(CAREFUL_KEY)];
  return quick && careful ? [quick, careful] : null;
}

async function AiProof() {
  const pair = await aiPair();
  const stats: Stat[] = [
    ...(pair ? [{ values: pair, label: "right answers, quick → careful" }] : []),
    { values: [String(aiCorpus.files)], label: `files · ${aiCorpus.languages} languages` },
    { values: [String(EVALSET.length)], label: "test questions" },
  ];
  return <ProofPanel stats={stats} />;
}

async function MoneyProof() {
  const c = await counters();
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
  const c = await counters();
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

async function PrivacyProof() {
  const c = await counters();
  const [leaks, keptOut, resurfaced] = [c.p4_careless_leaks ?? 0, c.p4_careful_kept_out ?? 0, c.p4_deleted_resurfaced ?? 0];
  if (!((c.p4_asks ?? 0) > 0)) return <ProofLine text="The Part 1 bot, logged in as one client. Ask it something and see whose files it reads." />;
  return (
    <ProofPanel
      stats={[
        { values: [leaks.toLocaleString("en-US")], label: "careless answers citing someone else's file" },
        { values: [keptOut.toLocaleString("en-US")], label: "pieces of other files kept from the careful AI" },
        { values: [resurfaced.toLocaleString("en-US")], label: "answers from a file that was deleted" },
      ]}
    />
  );
}

async function AuditProof() {
  const c = await counters();
  const launches = c.p5_launches ?? 0;
  if (!(launches > 0)) return <ProofLine text={`A cabinet built in two weeks, ${FINDINGS.length} problems ranked. Press launch and watch the month after.`} />;
  return (
    <ProofPanel
      stats={[
        { values: [String(FINDINGS.length)], label: "problems in the cabinet" },
        { values: [launches.toLocaleString("en-US")], label: "visitors pressed launch" },
        { values: [(c.p5_selfchecks ?? 0).toLocaleString("en-US")], label: "checked their own app" },
      ]}
    />
  );
}

/** Live numbers for each Part, by lab-config slug. Async: wrap in Suspense. */
export const PART_PROOF: Record<string, React.ReactNode> = {
  ai: <AiProof />,
  money: <MoneyProof />,
  web3: <Web3Proof />,
  privacy: <PrivacyProof />,
  audit: <AuditProof />,
};

const dollars = (cents: number) => formatCents(cents).replace(/\.\d\d$/, "");

/** The one number a Part leads with. Before there is live data, a fixed fact from the Part instead of a 0. */
const HEADLINE: Record<string, () => Promise<Stat>> = {
  ai: async () => {
    const pair = await aiPair();
    return pair ? { values: pair, label: "right answers, quick bot → careful bot" } : { values: [String(EVALSET.length)], label: "test questions, quick bot vs careful bot" };
  },
  money: async () => {
    const c = await counters();
    const [taken, held] = [c.ds_extracted_cents ?? 0, c.ds_defended_extracted_cents ?? 0];
    return taken > 0 && Number.isFinite(held)
      ? { values: [dollars(taken), dollars(held)], label: "taken by visitors, careless card → careful" }
      : { values: ["$100"], label: "one balance, up to 200 payments at once" };
  },
  web3: async () => {
    const n = (await counters()).w3_transfers_total ?? 0;
    return n > 0 ? { values: [n.toLocaleString("en-US")], label: "real payments on Sepolia" } : { values: ["7"], label: "ways to book a crypto payment wrong" };
  },
  privacy: async () => {
    const n = (await counters()).p4_careless_leaks ?? 0;
    return n > 0 ? { values: [n.toLocaleString("en-US")], label: "careless answers citing someone else's file" } : { values: ["10"], label: "clients in one portal, one AI reading every file" };
  },
  audit: async () => ({ values: [String(FINDINGS.length)], label: `findings in the cabinet · ${COUNTS.critical} critical` }),
};

export async function partHeadline(slug: string): Promise<Stat | null> {
  return HEADLINE[slug] ? HEADLINE[slug]() : null;
}

/** The home tiles sit right under the hero, so Parts the hero already shows get a different number. */
const TILE: Record<string, () => Promise<Stat>> = {
  ai: async () => ({ values: [String(aiCorpus.files)], label: "files the bot answers from" }),
  money: async () => {
    const n = (await counters()).ds_attacks_total ?? 0;
    return n > 0 ? { values: [`${n.toLocaleString("en-US")}×`], label: "visitors' attacks on one $100 balance" } : { values: ["6"], label: "ways money goes missing" };
  },
  web3: async () => ({ values: ["7"], label: "ways to book a crypto payment wrong" }),
  privacy: HEADLINE.privacy,
  audit: async () => ({ values: [String(FINDINGS.length)], label: `findings · ${COUNTS.critical} critical` }),
};

async function TileNumber({ slug }: { slug: string }) {
  const s = TILE[slug] ? await TILE[slug]() : null;
  return s && <TileStat stat={s} />;
}

/** A Part's number in the compact tile, streamed in behind a same-size skeleton. */
export function PartTileStat({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<TileSkeleton />}>
      <TileNumber slug={slug} />
    </Suspense>
  );
}

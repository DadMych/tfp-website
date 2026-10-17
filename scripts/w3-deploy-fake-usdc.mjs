// Compiles contracts/FakeUSDC.sol and deploys it to Sepolia from the lab's
// payer wallet, which receives the whole supply. Run once; then paste the
// printed address into FAKE_USDC in lib/web3/chain.ts.
//
//   node --env-file=.env.local scripts/w3-deploy-fake-usdc.mjs
//   node --env-file=.env.local scripts/w3-deploy-fake-usdc.mjs --compile-only

import { readFile } from "node:fs/promises";
import solc from "solc";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const source = await readFile("contracts/FakeUSDC.sol", "utf8");
const out = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { "FakeUSDC.sol": { content: source } },
      settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { FakeUSDC: ["abi", "evm.bytecode.object"] } } },
    })
  )
);
const errors = (out.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) {
  console.error(errors.map((e) => e.formattedMessage).join("\n"));
  process.exit(1);
}
const { abi, evm } = out.contracts["FakeUSDC.sol"].FakeUSDC;
console.log(`compiled: ${evm.bytecode.object.length / 2} bytes`);
if (process.argv.includes("--compile-only")) process.exit(0);

if (!process.env.W3_PAYER_KEY) {
  console.error("W3_PAYER_KEY is not set.");
  process.exit(1);
}
const transport = http(process.env.W3_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com");
const account = privateKeyToAccount(process.env.W3_PAYER_KEY);
const wallet = createWalletClient({ account, chain: sepolia, transport });
const chain = createPublicClient({ chain: sepolia, transport });

const hash = await wallet.deployContract({ abi, bytecode: `0x${evm.bytecode.object}` });
console.log(`sent: https://sepolia.etherscan.io/tx/${hash}`);
const receipt = await chain.waitForTransactionReceipt({ hash });
console.log(`FAKE_USDC = "${receipt.contractAddress}"`);

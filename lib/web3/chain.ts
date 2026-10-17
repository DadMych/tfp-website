import { createPublicClient, createWalletClient, encodeFunctionData, erc20Abi, hexToBytes, http, parseEther, type Address, type Hex } from "viem";
import { HDKey, hdKeyToAccount, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { withTx } from "@/lib/db";

/** Circle's USDC on Sepolia. Testnet money, no value. */
export const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;

/** The lab's own "USD Coin" (contracts/FakeUSDC.sol), deployed by scripts/w3-deploy-fake-usdc.mjs. */
export const FAKE_USDC: Address | null = "0xb1B61E586Bca9632360Fa8e6A31b3D8Fa30b66a5";

const symbols = new Map<string, string>();
/** What a token contract calls itself. Anyone can deploy a contract that says "USDC". */
export async function tokenSymbol(token: Address): Promise<string> {
  const key = token.toLowerCase();
  if (!symbols.has(key)) symbols.set(key, await chain.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }));
  return symbols.get(key)!;
}

const transport = http(process.env.W3_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com");
export const chain = createPublicClient({ chain: sepolia, transport });

const key = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return privateKeyToAccount(v as Hex);
};

/** The studio's receiving address. Public by design. */
export const studioAddress = () => key("W3_STUDIO_KEY").address;

/**
 * A deposit address of its own for one invoice: BIP-32 child `index` of a
 * root seeded by the studio key. Only the studio can spend from any of them.
 */
export function invoiceAddress(index: number): Address {
  const root = HDKey.fromMasterSeed(hexToBytes(process.env.W3_STUDIO_KEY as Hex));
  return hdKeyToAccount(root, { addressIndex: index }).address;
}

/** The other side of a payout: a freelancer's wallet, derived from the studio key. */
export function freelancerAddress(): Address {
  const root = HDKey.fromMasterSeed(hexToBytes(process.env.W3_STUDIO_KEY as Hex));
  return hdKeyToAccount(root, { accountIndex: 1 }).address;
}

export const transferData = (to: Address, units: bigint) => encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, units] });

type PayerWallet = ReturnType<typeof payerWallet>;
const payerWallet = () => createWalletClient({ account: key("W3_PAYER_KEY"), chain: sepolia, transport });

/**
 * Everything the lab wallet sends goes through here. One wallet, many
 * visitors, so sends are serialised by a Postgres lock and `fn` gets the next
 * free nonce: two sends picking the same nonce would replace each other.
 * `fn` reports each nonce it broadcast with `sent`, so the next caller doesn't
 * depend on a public RPC node that hasn't seen those sends yet.
 */
export async function withPayer<T>(fn: (wallet: PayerWallet, nonce: number, sent: (nonce: number) => void) => Promise<T>): Promise<T> {
  const wallet = payerWallet();
  return withTx(async (q) => {
    await q("SELECT pg_advisory_xact_lock(hashtext('w3_pay'))");
    const pending = await chain.getTransactionCount({ address: wallet.account.address, blockTag: "pending" });
    const [mem] = await q<{ n: string }>("SELECT next_nonce::text AS n FROM w3.payer WHERE id = 1 AND at > now() - interval '2 minutes'");
    let next = 0;
    const result = await fn(wallet, Math.max(pending, mem ? Number(mem.n) : 0), (n) => {
      next = Math.max(next, n + 1);
    });
    if (next > 0) {
      await q("INSERT INTO w3.payer (id, next_nonce, at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET next_nonce = $1, at = now()", [next]);
    }
    return result;
  });
}

/** Real transfers from the client's wallet, one per item, under one lock. */
export async function payTo(items: { to: Address; units: bigint; token?: Address }[]): Promise<Hex[]> {
  return withPayer(async (wallet, nonce, sent) => {
    const hashes: Hex[] = [];
    for (const [i, it] of items.entries()) {
      try {
        hashes.push(await wallet.writeContract({ address: it.token ?? USDC, abi: erc20Abi, functionName: "transfer", args: [it.to, it.units], nonce: nonce + i }));
        sent(nonce + i);
      } catch (err) {
        // Whatever already went out is real money on chain: hand it back so it gets recorded.
        if (hashes.length === 0) throw err;
        break;
      }
    }
    return hashes;
  });
}

/** The client's wallet pays: one real transfer of `token` per amount. */
export const pay = (amounts: bigint[], to: Address = studioAddress(), token: Address = USDC) => payTo(amounts.map((units) => ({ to, units, token })));

/** Whether the payer can still pay: enough of `token` and gas. */
export async function payerFunded(units: bigint, token: Address = USDC): Promise<boolean> {
  const { address } = key("W3_PAYER_KEY");
  const [usdc, eth] = await Promise.all([
    chain.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
    chain.getBalance({ address }),
  ]);
  return usdc >= units && eth >= parseEther("0.0002");
}

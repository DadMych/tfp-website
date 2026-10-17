import { createHash } from "node:crypto";

export interface Block {
  height: number;
  hash: string;
  parent: string;
  /** Made by the simulator, not by Sepolia. */
  sim?: boolean;
}

export interface Reorg {
  tip: number;
  depth: number;
}

/** First height the simulator replaced. */
export const forkHeight = (r: Reorg) => r.tip - r.depth + 1;

const simHash = (seed: string, height: number) => "0x" + createHash("sha256").update(`${seed}:${height}`).digest("hex");

/**
 * The chain one visitor sees: Sepolia's blocks, except that after a simulated
 * reorg every block from the fork up is a replacement that does not hold the deposit.
 * The replacements link to each other and to the last real block below the fork,
 * so a watcher can't tell them apart by shape, only by comparing hashes it trusted.
 */
export function sessionView(real: Block[], reorg: Reorg | null, seed: string): Map<number, Block> {
  const view = new Map(real.map((b) => [b.height, b]));
  if (!reorg) return view;
  const fork = forkHeight(reorg);
  for (const b of real) {
    if (b.height < fork) continue;
    const below = b.height === fork ? view.get(fork - 1)?.hash ?? b.parent : simHash(seed, b.height - 1);
    view.set(b.height, { height: b.height, hash: simHash(seed, b.height), parent: below, sim: true });
  }
  return view;
}

export interface Watched {
  block_height: number | null;
  block_hash: string | null;
  needed: number;
  careless_paid_tip: number | null;
  careful_paid_tip: number | null;
  careful_paid_hash: string | null;
  careful_caught_tip: number | null;
}

/** How many blocks deep the deposit sits in this view. 0 = not in it. */
export function confirmations(d: Watched, view: Map<number, Block>, tip: number) {
  if (d.block_height == null || view.get(d.block_height)?.hash !== d.block_hash) return 0;
  return tip - d.block_height + 1;
}

/** One look at the chain by both watchers. Returns only what changed. */
export function step(d: Watched, view: Map<number, Block>, tip: number): Partial<Watched> {
  const conf = confirmations(d, view, tip);
  const patch: Partial<Watched> = {};

  // Careless: paid the moment it shows up, and never looks back.
  if (d.careless_paid_tip == null && conf >= 1) patch.careless_paid_tip = tip;

  // Careful: waits for N blocks on top, remembers the block it trusted,
  // and checks that block is still there every time it looks.
  if (d.careful_paid_tip == null && conf >= d.needed) {
    patch.careful_paid_tip = tip;
    patch.careful_paid_hash = d.block_hash;
  }
  const trusted = d.careful_paid_hash ?? patch.careful_paid_hash;
  if (trusted && d.careful_caught_tip == null && view.get(d.block_height!)?.hash !== trusted) patch.careful_caught_tip = tip;

  return patch;
}

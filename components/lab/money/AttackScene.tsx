"use client";

import { useEffect, useRef } from "react";
import type { Level, RequestEvent } from "@/lib/lab/double-spend";

/**
 * The attack as a picture: three cards on cream paper.
 *
 *   YOU ──$5──▶ APP ──read──▶ POSTGRES
 *          ◀──✓──     ◀──$100──
 *
 * Every chip is one real request, placed by the t0 / tRead / t1 the server
 * measured. Each card shows exactly one number or one sentence.
 */

export const SCENE_W = 1000;
export const SCENE_H = 380;

const TRAVEL = 25;
const PRE = 45;
const POST = 45;

const A = { x: 24, w: 176 };
const P = { x: 306, w: 372 };
const D = { x: 786, w: 190 };
/** Chips stop this far from a card edge, so they never sit on a border. */
const PAD = 24;
const TOP = 44;
const BOT = 332;

const C = {
  paper: "#FFFDF5",
  white: "#FFFFFF",
  black: "#000000",
  ink60: "rgba(0,0,0,0.6)",
  grid: "rgba(0,0,0,0.08)",
  lane: "rgba(0,0,0,0.10)",
  yellow: "#FFE600",
  green: "#22C55E",
  red: "#FF0000",
  grey: "#C8C2AE",
};

export interface SceneProps {
  events: RequestEvent[];
  lanes: number;
  level: Level;
  start: number;
  amount: number;
  plain: boolean;
  tRef: React.MutableRefObject<number>;
  example?: boolean;
  /** From the server once the attack is done; L1/L2 need it to tell real debits from stale ones. */
  finalBalance?: number;
}

/** The one sentence inside the APP card, per level. `$` is replaced with the amount. */
const RULE: Record<Level, { tech: string[]; plain: string[] }> = {
  0: { tech: ["UPDATE balance − $", "no check"], plain: ["Says yes to every payment.", "Never looks at the balance."] },
  1: { tech: ["read balance, if ≥ $", "SET balance = read − $"], plain: ["Asks the bank how much is left,", "then tells it the new total."] },
  2: { tech: ["lock in memory, read,", "SET balance = read − $"], plain: ["Two copies of the shop,", "each with its own line."] },
  3: { tech: ["SELECT … FOR UPDATE", "then if, then UPDATE"], plain: ["The bank lets one payment in", "at a time. The rest wait."] },
  4: { tech: ["UPDATE … WHERE", "balance ≥ $"], plain: ["The bank checks and pays", "in one step. No gap."] },
};

const $ = (c: number) => (c < 0 ? "−" : "") + (c % 100 === 0 ? `$${Math.abs(c) / 100}` : `$${(Math.abs(c) / 100).toFixed(2)}`);
const lerp = (a: number, b: number, p: number) => a + (b - a) * Math.min(1, Math.max(0, p));
const outcomeColor = (o: RequestEvent["outcome"], phantom: boolean) => (o === "approved" ? (phantom ? C.red : C.green) : o === "refused" ? C.yellow : C.grey);
const glyph = (o: RequestEvent["outcome"]) => (o === "approved" ? "✓" : "✗");

export function laneY(worker: number, lanes: number, level: Level): number {
  if (level === 2) {
    const pod = worker % 2;
    const inPod = pod === 0 ? Math.ceil(lanes / 2) : Math.max(1, Math.floor(lanes / 2));
    const i = Math.floor(worker / 2);
    const half = (BOT - TOP) / 2;
    const avail = half - 60;
    const band = Math.min(avail, inPod * 22);
    const y0 = TOP + pod * half + 44 + (avail - band) / 2;
    return y0 + (i + 0.5) * (band / inPod);
  }
  const avail = BOT - TOP - 80;
  const band = Math.min(avail, lanes * 22);
  return TOP + 56 + (avail - band) / 2 + (worker + 0.5) * (band / lanes);
}

export function landTime(e: RequestEvent): number {
  const writeStart = e.tRead ?? e.t0;
  return e.t1 - Math.min(TRAVEL, (e.t1 - writeStart) / 2);
}

export const hasWrite = (e: RequestEvent) => e.outcome === "approved" || e.outcome === "refused";

/**
 * Approvals the balance never paid for. Total always equals the server's `extracted / amount`.
 * L1/L2 write an absolute number, so a stale write takes nothing: of all writes that read the
 * same balance only the first one landing is real, capped by what the balance really lost.
 */
export function phantomSet(events: RequestEvent[], start: number, amount: number, level: Level, finalBalance?: number): Set<number> {
  const set = new Set<number>();
  const approved = events.filter((e) => e.outcome === "approved").sort((a, b) => landTime(a) - landTime(b));
  if (level === 1 || level === 2) {
    const final = finalBalance ?? (approved.length ? approved[approved.length - 1].after ?? start : start);
    let real = Math.max(0, Math.min(start, start - final)) / amount;
    const seen = new Set<number | null>();
    for (const e of approved) {
      if (real > 0 && !seen.has(e.read)) {
        seen.add(e.read);
        real--;
      } else set.add(e.seq);
    }
    return set;
  }
  const maxFunded = Math.floor(start / amount);
  approved.forEach((e, i) => i >= maxFunded && set.add(e.seq));
  return set;
}

type Chip = { x: number; y: number; label: string; fill: string; ink: string };

export default function AttackScene(props: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const mono = getComputedStyle(canvas).fontFamily || "ui-monospace, monospace";
    const display = getComputedStyle(canvas.parentElement!).fontFamily || "sans-serif";

    let raf = 0;
    let cssW = 0;
    const ro = new ResizeObserver(() => {
      cssW = canvas.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(((cssW * SCENE_H) / SCENE_W) * dpr);
    });
    ro.observe(canvas);
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!cssW) return;
      const s = canvas.width / SCENE_W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      draw(ctx, propsRef.current, propsRef.current.tRef.current, mono, display);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="font-display relative overflow-x-auto bg-cream">
      <canvas ref={canvasRef} className="font-mono block w-full min-w-[720px]" style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }} role="img" aria-label="Requests travel from you through the app to Postgres and back" />
      <span className="sm:hidden sticky left-2 bottom-2 inline-block ml-2 mb-2 border-[2px] border-brutal-black bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]" aria-hidden="true">
        swipe → to the database
      </span>
    </div>
  );
}

/* ───────────────────────────── drawing ───────────────────────────── */

function draw(ctx: CanvasRenderingContext2D, p: SceneProps, T: number, mono: string, display: string) {
  const { events, lanes, level, start, amount, plain } = p;
  const phantom = phantomSet(events, start, amount, level, p.finalBalance);

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= SCENE_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SCENE_H);
    ctx.stroke();
  }
  for (let y = 0; y <= SCENE_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SCENE_W, y);
    ctx.stroke();
  }

  /* ── where is every request ── */
  const chips: Chip[] = [];
  const waiting: number[] = [];
  /** L2: waiting for the pod's own lock. L3: waiting for the row lock. L4: at the database, nothing to wait for but the reply. */
  const inLine = [0, 0];
  let balance = start;
  let balanceT = -1;
  let paidLanded = 0;
  let phantomLanded = 0;
  let refusedFlash = false;
  let sent = 0;
  const tally = [
    { yes: 0, ghost: 0, no: 0 },
    { yes: 0, ghost: 0, no: 0 },
  ];

  for (const e of events) {
    const y = laneY(e.worker, lanes, level);
    const tPre = e.t0 - PRE;
    if (T < tPre) continue;
    sent++;
    if (T >= e.t1) {
      const t = tally[level === 2 ? e.worker % 2 : 0];
      if (e.outcome === "approved") {
        paidLanded++;
        if (phantom.has(e.seq)) {
          t.ghost++;
          phantomLanded++;
        } else t.yes++;
      } else t.no++;
    }

    if (T < e.t0) {
      chips.push({ x: lerp(A.x + A.w + PAD, P.x - PAD, (T - tPre) / PRE), y, label: $(amount), fill: C.white, ink: C.black });
      continue;
    }
    let writeStart = e.t0;
    if (e.tRead !== null) {
      const trav = Math.min(TRAVEL, (e.tRead - e.t0) / 2);
      if (T < e.tRead) {
        // L2's tRead includes the wait for the in-process lock, so the read itself happens at the end.
        if (level === 2 && T < e.tRead - 2 * trav) inLine[e.worker % 2]++;
        else if (level === 2 && T < e.tRead - trav) chips.push({ x: lerp(P.x + P.w + PAD, D.x - PAD, (T - (e.tRead - 2 * trav)) / trav), y, label: "read?", fill: C.white, ink: C.black });
        else if (level !== 2 && T < e.t0 + trav) chips.push({ x: lerp(P.x + P.w + PAD, D.x - PAD, (T - e.t0) / trav), y, label: "read?", fill: C.white, ink: C.black });
        else if (level !== 2 && T < e.tRead - trav) {
          waiting.push(y);
          if (level === 3) inLine[0]++;
        } else chips.push({ x: lerp(D.x - PAD, P.x + P.w + PAD, (T - (e.tRead - trav)) / trav), y, label: $(e.read ?? 0), fill: C.yellow, ink: C.black });
        continue;
      }
      writeStart = e.tRead;
    }
    // L4 has no read: even a decline is the database's answer to the UPDATE.
    const write = hasWrite(e) || level === 4;
    const trav2 = Math.min(TRAVEL, (e.t1 - writeStart) / 2);
    const land = e.t1 - trav2;

    if (T < e.t1) {
      if (!write) chips.push({ x: P.x + P.w + PAD, y, label: "✗", fill: C.grey, ink: C.black });
      else if (T < writeStart + trav2) chips.push({ x: lerp(P.x + P.w + PAD, D.x - PAD, (T - writeStart) / trav2), y, label: level === 1 || level === 2 ? `=${$(e.after ?? 0)}` : `−${$(amount)}`, fill: C.white, ink: C.black });
      else if (T < land) {
        waiting.push(y);
        if (level === 4) inLine[0]++;
      }
      else chips.push({ x: lerp(D.x - PAD, P.x + P.w + PAD, (T - land) / trav2), y, label: glyph(e.outcome), fill: outcomeColor(e.outcome, phantom.has(e.seq)), ink: C.black });
    }
    if (T >= land && e.after !== null) {
      // L1/L2: the last write wins, stale or not. Elsewhere every write is applied to the live row, so the balance only goes down.
      if (level === 1 || level === 2) {
        if (land > balanceT) {
          balanceT = land;
          balance = e.after;
        }
      } else balance = Math.min(balance, e.after);
    }
    if (e.outcome === "refused" && T >= land && T - land < 260) refusedFlash = true;
    if (T >= e.t1 && T < e.t1 + POST) chips.push({ x: lerp(P.x - PAD, A.x + A.w + PAD, (T - e.t1) / POST), y, label: glyph(e.outcome), fill: outcomeColor(e.outcome, phantom.has(e.seq)), ink: C.black });
  }
  const paid = paidLanded * amount;
  const maxFunded = Math.floor(start / amount);

  /* ── lanes ── */
  ctx.strokeStyle = C.lane;
  ctx.lineWidth = 1;
  for (let w = 0; w < lanes; w++) {
    const y = laneY(w, lanes, level);
    ctx.beginPath();
    ctx.moveTo(A.x + A.w, y);
    ctx.lineTo(D.x, y);
    ctx.stroke();
  }

  /* ── cards ── */
  card(ctx, A.x, TOP, A.w, BOT - TOP);
  if (level === 2) {
    const half = (BOT - TOP) / 2;
    card(ctx, P.x, TOP, P.w, half - 10);
    card(ctx, P.x, TOP + half + 10, P.w, half - 10);
    const lbx = (A.x + A.w + P.x) / 2;
    const lby = (TOP + BOT) / 2;
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lbx, lby - 22);
    ctx.lineTo(lbx + 22, lby);
    ctx.lineTo(lbx, lby + 22);
    ctx.lineTo(lbx - 22, lby);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    text(ctx, "LB", lbx, lby + 4, `bold 11px ${mono}`, C.black, "center");
  } else {
    card(ctx, P.x, TOP, P.w, BOT - TOP);
  }
  card(ctx, D.x, TOP, D.w, BOT - TOP);

  tag(ctx, "YOU", A.x, TOP, mono);
  if (level === 2) {
    tag(ctx, "APP · POD A", P.x, TOP, mono);
    tag(ctx, "APP · POD B", P.x, TOP + (BOT - TOP) / 2 + 10, mono);
  } else tag(ctx, "APP", P.x, TOP, mono);
  tag(ctx, "POSTGRES", D.x, TOP, mono);

  /* ── what each card is, in words anyone reads ── */
  const role = `11px ${display}`;
  text(ctx, plain ? "you, paying with the card" : "you, the attacker", A.x + 16, TOP + 42, role, C.black, "left", 0, A.w - 32);
  if (level !== 2) text(ctx, plain ? "the shop: says yes or no to each payment" : "the shop's server: approves or declines", P.x + 16, TOP + 42, role, C.black, "left", 0, P.w - 32);
  text(ctx, plain ? "the bank: holds the money" : "the database, keeps the $", D.x + 16, TOP + 42, role, C.black, "left", 0, D.w - 32);

  /* ── YOU: what you tried, what you got, what was extra ── */
  const aw = A.w - 32;
  text(ctx, plain ? "tried to take" : "requested", A.x + 16, TOP + 66, `bold 10px ${mono}`, C.ink60, "left", 0.2, aw);
  text(ctx, `${$(sent * amount)}`, A.x + 16, TOP + 88, `900 20px ${display}`, C.black, "left", 0, aw);
  text(ctx, plain ? "actually got" : "paid out", A.x + 16, TOP + 112, `bold 10px ${mono}`, C.ink60, "left", 0.2, aw);
  text(ctx, $(paid), A.x + 16, TOP + 148, `900 36px ${display}`, paid > start ? C.red : C.black, "left", 0, aw);
  const extra = phantomLanded * amount;
  text(
    ctx,
    extra > 0 ? `+${$(extra)} ${plain ? "that wasn't there" : "phantom"}` : plain ? "nothing extra" : "no phantom",
    A.x + 16,
    TOP + 168,
    `bold 11px ${mono}`,
    extra > 0 ? C.red : C.ink60,
    "left",
    0,
    aw
  );
  const cols = 9;
  const bw = 13;
  const bh = 6;
  const gap = 3;
  const baseY = BOT - 16;
  const maxRows = Math.floor((baseY - (TOP + 214)) / (bh + gap));
  const slots = Math.min(cols * maxRows, Math.max(maxFunded, paidLanded));
  text(ctx, plain ? `${$(start)} can pay for` : `${$(start)} funds`, A.x + 16, TOP + 190, `bold 10px ${mono}`, C.ink60, "left", 0.2, aw);
  text(ctx, plain ? `${maxFunded} payments of ${$(amount)}` : `${maxFunded} × ${$(amount)}`, A.x + 16, TOP + 207, `bold 13px ${display}`, C.black, "left", 0, aw);
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.ink60;
  for (let i = 0; i < slots; i++) {
    const bx = A.x + 16 + (i % cols) * (bw + gap);
    const by = baseY - Math.floor(i / cols) * (bh + gap) - bh;
    if (i < paidLanded) {
      ctx.fillStyle = i < paidLanded - phantomLanded ? C.green : C.red;
      ctx.fillRect(bx, by, bw, bh);
    } else if (i < maxFunded) ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  }

  /* ── APP: one sentence ── */
  const rule = RULE[level][plain ? "plain" : "tech"].map((l) => l.replace("$", $(amount)));
  const ruleFont = plain ? `bold 20px ${display}` : `bold 16px ${mono}`;
  const labels = plain ? ["said yes", "yes, no money", "said no"] : ["approved", "unfunded", "declined"];
  if (level === 2) {
    const half = (BOT - TOP) / 2;
    for (const pod of [0, 1]) {
      const y0 = TOP + pod * (half + 10);
      const n = inLine[pod];
      const label = `${plain ? "in its line" : "lock queue"} ${n}`;
      ctx.font = `bold 10px ${mono}`;
      const bw = ctx.measureText(label).width + label.length * 10 * 0.15 + 16;
      const bx = P.x + P.w - 16 - bw;
      ctx.fillStyle = n > 0 ? C.yellow : C.white;
      ctx.fillRect(bx, y0 + 34, bw, 24);
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, y0 + 34, bw, 24);
      text(ctx, label, bx + 8, y0 + 50, `bold 10px ${mono}`, C.black, "left", 0.15);
      text(ctx, rule[pod], P.x + 16, y0 + 52, plain ? `bold 17px ${display}` : `bold 14px ${mono}`, C.black, "left", 0, bx - P.x - 28);
      tallies(ctx, P.x + 16, y0 + 66, P.w - 32, 52, tally[pod], labels, mono, display);
    }
  } else {
    rule.forEach((l, i) => text(ctx, l, P.x + 16, TOP + 82 + i * 26, ruleFont, C.black, "left", 0, P.w - 32));
    text(ctx, plain ? "what it has answered so far" : "responses so far", P.x + 16, BOT - 96, `bold 10px ${mono}`, C.ink60, "left", 0.2);
    tallies(ctx, P.x + 16, BOT - 84, P.w - 32, 64, tally[0], labels, mono, display);
  }

  /* ── POSTGRES: one number ── */
  const dw = D.w - 32;
  text(ctx, plain ? "balance says" : "balance_cents", D.x + 16, TOP + 70, `bold 10px ${mono}`, C.ink60, "left", 0.2, dw);
  text(ctx, $(balance), D.x + 16, TOP + 108, `900 40px ${display}`, balance < 0 ? C.red : C.black, "left", 0, dw);
  text(ctx, `${plain ? "started with" : "start"} ${$(start)}`, D.x + 16, TOP + 128, `bold 11px ${mono}`, C.ink60, "left", 0, dw);
  if (level === 4) {
    text(ctx, plain ? "at the bank now" : "in flight at Postgres", D.x + 16, TOP + 168, `bold 10px ${mono}`, C.ink60, "left", 0.2, dw);
    text(ctx, String(inLine[0]), D.x + 16, TOP + 202, `900 32px ${display}`, inLine[0] > 0 ? C.black : C.ink60, "left", 0, dw);
  }
  if (level === 3) {
    text(ctx, plain ? "waiting in line" : "blocked on row lock", D.x + 16, TOP + 168, `bold 10px ${mono}`, C.ink60, "left", 0.2, dw);
    text(ctx, String(inLine[0]), D.x + 16, TOP + 202, `900 32px ${display}`, inLine[0] > 0 ? C.black : C.ink60, "left", 0, dw);
  }
  if (level >= 3) {
    ctx.fillStyle = refusedFlash ? C.yellow : C.white;
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.fillRect(D.x + 16, BOT - 40, D.w - 32, 24);
    ctx.strokeRect(D.x + 16, BOT - 40, D.w - 32, 24);
    text(ctx, plain ? "RULE: never below $0" : "CHECK (balance ≥ 0)", D.x + 24, BOT - 24, `bold 10px ${mono}`, C.black, "left", 0, dw - 16);
  }

  /* ── requests waiting at the database door ── */
  const spacing = laneY(1, Math.max(2, lanes), level) - laneY(0, Math.max(2, lanes), level);
  const qh = Math.max(3, Math.min(12, spacing - 2));
  for (const y of waiting) {
    ctx.strokeStyle = C.black;
    ctx.lineWidth = qh >= 6 ? 1.5 : 1;
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.arc(D.x - PAD, y, qh / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /* ── chips ── */
  const chipH = Math.max(7, Math.min(14, spacing - 1));
  for (const c of chips) chip(ctx, c, mono, chipH);

  if (p.example) text(ctx, plain ? "EXAMPLE · 3 payments of $5, card holds $10" : "EXAMPLE · 3 × $5 against $10", 24, SCENE_H - 14, `bold 10px ${mono}`, C.ink60, "left", 0.2);
  text(ctx, `${Math.max(0, Math.round(Math.min(T, Math.max(0, ...events.map((e) => e.t1)))))} ms`, SCENE_W - 24, SCENE_H - 14, `bold 10px ${mono}`, C.ink60, "right");
}

function tallies(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: { yes: number; ghost: number; no: number },
  labels: string[],
  mono: string,
  display: string
) {
  const items = [
    { n: t.yes, fill: C.green, label: labels[0] },
    { n: t.ghost, fill: C.red, label: labels[1] },
    { n: t.no, fill: C.grey, label: labels[2] },
  ];
  const g = 8;
  const bw = (w - g * 2) / 3;
  const size = h >= 60 ? 30 : 24;
  items.forEach((it, i) => {
    const bx = x + i * (bw + g);
    ctx.fillStyle = it.n > 0 ? it.fill : C.white;
    ctx.fillRect(bx, y, bw, h);
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, y, bw, h);
    text(ctx, String(it.n), bx + 10, y + size + 6, `900 ${size}px ${display}`, C.black, "left", 0, bw - 20);
    text(ctx, it.label, bx + 10, y + h - 9, `bold 9px ${mono}`, C.black, "left", 0.1, bw - 20);
  });
}

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = C.black;
  ctx.fillRect(x + 6, y + 6, w, h);
  ctx.fillStyle = C.white;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.black;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
}

function tag(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, mono: string) {
  ctx.font = `bold 11px ${mono}`;
  const w = ctx.measureText(t).width + t.length * 11 * 0.15 + 18;
  ctx.fillStyle = C.black;
  ctx.fillRect(x, y, w, 24);
  text(ctx, t, x + 9, y + 16, `bold 11px ${mono}`, C.paper, "left", 0.15);
}

/** `maxW`: shrink the font until the line fits, so no text ever crosses a card edge. */
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, spacing = 0, maxW = Infinity) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${spacing}em`;
  if (maxW < Infinity) {
    const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 10);
    let size = px;
    while (size > 6 && ctx.measureText(s).width > maxW) {
      size -= 0.5;
      ctx.font = font.replace(/\d+(?:\.\d+)?px/, `${size}px`);
    }
  }
  ctx.fillText(s, x, y);
  if ("letterSpacing" in c) c.letterSpacing = "0em";
}

function chip(ctx: CanvasRenderingContext2D, c: Chip, mono: string, h: number) {
  const fs = h >= 11 ? 9 : 7;
  ctx.font = `bold ${fs}px ${mono}`;
  const w = Math.max(h + 10, ctx.measureText(c.label).width + 10);
  ctx.fillStyle = c.fill;
  ctx.fillRect(c.x - w / 2, c.y - h / 2, w, h);
  ctx.strokeStyle = C.black;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(c.x - w / 2, c.y - h / 2, w, h);
  text(ctx, c.label, c.x, c.y + fs * 0.38, `bold ${fs}px ${mono}`, c.ink, "center");
}

/* ───────────────────────────── example ───────────────────────────── */

export const EXAMPLE = { start: 1000, amount: 500, lanes: 3, dur: 230 } as const;

export function exampleEvents(level: Level): RequestEvent[] {
  const ev = (seq: number, outcome: RequestEvent["outcome"], read: number | null, after: number | null, t0: number, tRead: number | null, t1: number): RequestEvent => ({ seq, worker: seq, outcome, read, after, t0, tRead, t1 });
  switch (level) {
    case 0:
      return [ev(0, "approved", null, 500, 0, null, 60), ev(1, "approved", null, 0, 3, null, 66), ev(2, "approved", null, -500, 6, null, 72)];
    case 1:
      return [ev(0, "approved", 1000, 500, 0, 52, 110), ev(1, "approved", 1000, 500, 3, 55, 116), ev(2, "approved", 1000, 500, 6, 58, 122)];
    case 2:
      return [ev(0, "approved", 1000, 500, 0, 52, 110), ev(1, "approved", 1000, 500, 3, 55, 116), ev(2, "approved", 500, 0, 6, 150, 200)];
    case 3:
      return [ev(0, "approved", 1000, 500, 0, 52, 110), ev(1, "approved", 500, 0, 3, 128, 180), ev(2, "declined", 0, 0, 6, 196, 206)];
    case 4:
      return [ev(0, "approved", null, 500, 0, null, 58), ev(1, "approved", null, 0, 3, null, 63), ev(2, "declined", 0, 0, 6, null, 68)];
  }
}

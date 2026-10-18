"use client";

import { C, P, Size, box, coin, ease, fall, fit, newPile, particle, rnd, star, tag, text, useArena } from "../arena";
import { Btn, Controls, Readout, Stage, Stepper, Switch, Toy } from "../kit";

const BILLS = [10000, 2000, 4999, 13337, 999, 25000, 7001];
const FLY = 650;

function shares(total: number, n: number, fair: boolean): number[] {
  if (!fair) return Array.from({ length: n }, () => Math.round(total / n));
  const base = Math.floor(total / n), rem = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

interface Piece { i: number; c: number; t0: number; sx: number; sy: number; rot: number }
interface World {
  fair: boolean;
  n: number;
  b: number;
  got: (number | null)[];
  pieces: Piece[];
  strays: P[];
  pile: Float32Array;
  sparks: { x: number; y: number; t0: number }[];
  lost: number;
  printed: number;
  splits: number;
  delta: number;
  billIn: number;
}

const init = (fair = false, n = 3, b = 0): World => ({
  fair, n, b, got: Array(n).fill(null), pieces: [], strays: [], pile: newPile(), sparks: [], lost: 0, printed: 0, splits: 0, delta: 0, billIn: -1e9,
});

function layout(s: Size, n: number) {
  const bw = Math.min(200, s.W - 40), bh = 58;
  const bill = { x: (s.W - bw) / 2, y: 18, w: bw, h: bh };
  const cols = n > 5 ? Math.ceil(n / 2) : n;
  const rows = n > 5 ? 2 : 1;
  const gw = (s.W - 24 - (cols - 1) * 6) / cols, gh = 44;
  const gutter = s.H - 14;
  const slot = (i: number) => ({ x: 12 + (i % cols) * (gw + 6), y: gutter - 16 - rows * (gh + 6) + Math.floor(i / cols) * (gh + 6), w: gw, h: gh });
  return { bill, slot, gutter };
}

function split(w: World, t: number, s: Size) {
  const total = BILLS[w.b % BILLS.length];
  const parts = shares(total, w.n, w.fair);
  const L = layout(s, w.n);
  w.got = Array(w.n).fill(null);
  w.pieces = parts.map((c, i) => ({ i, c, t0: t + i * 60, sx: L.bill.x + ((i + 0.5) / w.n) * L.bill.w, sy: L.bill.y + L.bill.h / 2, rot: rnd(-0.6, 0.6) }));
  const sum = parts.reduce((a, b) => a + b, 0);
  w.delta = sum - total;
  w.splits++;
  if (w.delta < 0) {
    w.lost += -w.delta;
    for (let k = 0; k < -w.delta; k++) w.strays.push(particle(s.W / 2 + rnd(-20, 20), L.bill.y + L.bill.h, rnd(-160, 160), rnd(-200, -60), "lost", t + 200));
  } else if (w.delta > 0) {
    w.printed += w.delta;
    for (let k = 0; k < w.delta; k++) w.sparks.push({ x: rnd(30, s.W - 30), y: rnd(100, 150), t0: t + 300 + k * 120 });
  }
  w.billIn = t + FLY + w.n * 60;
}

function step(w: World, dt: number, t: number, s: Size) {
  const L = layout(s, w.n);
  for (const p of w.pieces) if (t - p.t0 >= FLY && w.got[p.i] === null) w.got[p.i] = p.c;
  for (const c of w.strays) if (t >= c.t0) fall(c, dt, w.pile, L.gutter, 6, 5, 0, s.W);
  if (w.strays.length > 120) w.strays.splice(0, w.strays.length - 120);
  w.sparks = w.sparks.filter((p) => t - p.t0 < 1000);
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, s: Size, f: { d: string; m: string }) {
  const L = layout(s, w.n);
  const total = BILLS[w.b % BILLS.length];
  ctx.fillStyle = C.pink; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }

  // the bill (slides back in after a split)
  const k = ease((t - w.billIn) / 300);
  const visible = w.splits === 0 || t > w.billIn;
  if (visible) {
    const y = w.splits === 0 ? L.bill.y : L.bill.y - (1 - k) * 90;
    box(ctx, L.bill.x, y, L.bill.w, L.bill.h, C.lime);
    ctx.strokeStyle = C.black; ctx.lineWidth = 2; ctx.strokeRect(L.bill.x + 6, y + 6, L.bill.w - 12, L.bill.h - 12);
    const label = `$${(total / 100).toFixed(2)}`;
    text(ctx, label, s.W / 2, y + L.bill.h / 2 + 2, `900 ${fit(ctx, label, L.bill.w - 40, 28, f.d)}px ${f.d}`, C.black, "center", "middle");
    text(ctx, `÷ ${w.n}`, L.bill.x + L.bill.w - 10, y + 16, `bold 10px ${f.m}`, C.black, "right");
  }

  // people
  const parts = shares(total, w.n, w.fair);
  const min = Math.min(...parts);
  for (let i = 0; i < w.n; i++) {
    const sl = L.slot(i);
    const c = w.got[i];
    box(ctx, sl.x, sl.y, sl.w, sl.h, c === null ? C.cream : w.fair && c > min ? C.lime : C.yellow, 4, 2.5);
    text(ctx, String.fromCharCode(65 + i), sl.x + 5, sl.y + 12, `bold 9px ${f.m}`);
    if (c !== null) {
      const s2 = `$${(c / 100).toFixed(2)}`;
      text(ctx, s2, sl.x + sl.w / 2, sl.y + sl.h - 12, `bold ${fit(ctx, s2, sl.w - 6, 12, f.m, "bold")}px ${f.m}`, C.black, "center");
    }
  }

  // flying pieces
  for (const p of w.pieces) {
    if (t < p.t0 || w.got[p.i] !== null) continue;
    const q = ease((t - p.t0) / FLY), sl = L.slot(p.i);
    const x = p.sx + (sl.x + sl.w / 2 - p.sx) * q, y = p.sy + (sl.y + sl.h / 2 - p.sy) * q - Math.sin(q * Math.PI) * 40;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot * q * 4);
    const pw = Math.max(18, L.bill.w / w.n - 4);
    ctx.fillStyle = C.black; ctx.fillRect(-pw / 2 + 3, -18 + 3, pw, 36);
    ctx.fillStyle = C.lime; ctx.fillRect(-pw / 2, -18, pw, 36); ctx.strokeStyle = C.black; ctx.lineWidth = 2; ctx.strokeRect(-pw / 2, -18, pw, 36);
    ctx.restore();
  }

  // the gutter: cents nobody owns
  ctx.fillStyle = C.black; ctx.fillRect(0, L.gutter, s.W, s.H - L.gutter);
  text(ctx, w.lost ? `NOBODY'S: ${w.lost}¢` : "NOBODY'S", 8, s.H - 4, `bold 8px ${f.m}`, C.pink);
  if (w.printed) text(ctx, `PRINTED: ${w.printed}¢`, s.W - 8, s.H - 4, `bold 8px ${f.m}`, C.lime, "right");
  for (const c of w.strays) if (t >= c.t0) coin(ctx, c.x, c.y, 6, c.rot, C.white, "", f);
  for (const p of w.sparks) {
    if (t < p.t0) continue;
    const q = (t - p.t0) / 1000;
    ctx.globalAlpha = 1 - q;
    star(ctx, p.x, p.y - q * 20, 10 + q * 6, C.lime, 6);
    text(ctx, "+1¢", p.x, p.y - q * 20 + 1, `bold 8px ${f.m}`, C.black, "center", "middle");
    ctx.globalAlpha = 1;
  }
  if (w.splits === 0) tag(ctx, "TAP THE BILL", s.W / 2 - 44, L.bill.y + L.bill.h + 14, f);
}

const snap = (w: World) => ({ n: w.n, fair: w.fair, delta: w.delta, lost: w.lost, printed: w.printed, splits: w.splits });

export default function SplitGame() {
  const { canvas, snap: s, act } = useArena({ init: () => init(), step, draw, snap });

  return (
    <Toy>
      <Stage canvas={canvas} label={`Split ${s.splits} bills, ${s.lost} cents lost, ${s.printed} cents printed`} onDown={() => act((w, t, sz) => split(w, t, sz))} hint="click to split" />
      <Readout bad={!s.fair && s.splits > 0 && s.delta !== 0}>
        {s.splits === 0 ? "Split the bill. Watch the last cent." : s.delta < 0 ? `${-s.delta}¢ vanished. Whose was it?` : s.delta > 0 ? `${s.delta}¢ printed from nothing` : "Every cent has an owner"}
      </Readout>
      <Controls fix={<Switch on={s.fair} onClick={() => act((w) => Object.assign(w, init(!w.fair, w.n, w.b)))} label="largest remainder" />}>
        <Stepper value={s.n} unit="ppl" onStep={(d) => act((w, t, sz) => { w.n = Math.min(9, Math.max(2, w.n + d)); w.pieces = []; split(w, t, sz); })} />
        <Btn tone="white" onClick={() => act((w, t, sz) => { w.b++; split(w, t, sz); })}>New bill</Btn>
      </Controls>
    </Toy>
  );
}

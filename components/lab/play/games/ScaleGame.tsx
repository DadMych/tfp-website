"use client";

import { C, Size, clamp, coin, rnd, star, tag, text, useArena } from "../arena";
import { Btn, Controls, Readout, Stage, Switch, Toy } from "../kit";

const COIN = 10;

interface Drop { side: 0 | 1; x: number; y: number; vy: number; t0: number; boom: number | null; dx: number }
interface World {
  fix: boolean;
  out: number;
  inn: number;
  ang: number;
  av: number;
  drops: Drop[];
  booms: { x: number; y: number; t0: number; s: string; fill: string }[];
  rolled: number;
}

const init = (fix = false): World => ({ fix, out: 0, inn: 0, ang: 0, av: 0, drops: [], booms: [], rolled: 0 });

function geo(w: World, s: Size) {
  const cx = s.W / 2, cy = 96;
  const L = Math.min(150, s.W * 0.32);
  const pan = (side: 0 | 1) => {
    const d = side ? 1 : -1;
    return { x: cx + d * L * Math.cos(w.ang), y: cy + d * L * Math.sin(w.ang) };
  };
  return { cx, cy, L, pan, panDrop: 58 };
}

function pay(w: World, crash: boolean, t: number, s: Size) {
  const g = geo(w, s);
  for (let i = 0; i < 3; i++) {
    for (const side of [0, 1] as const) {
      const p = g.pan(side);
      const doomed = crash && (w.fix || side === 1);
      w.drops.push({ side, x: p.x + rnd(-10, 10), y: -20 - i * 34, vy: 0, t0: t + i * 90, boom: doomed ? 70 + rnd(0, 20) : null, dx: rnd(-6, 6) });
    }
  }
  if (crash && w.fix) w.rolled++;
}

function step(w: World, dt: number, t: number, s: Size) {
  const g = geo(w, s);
  const target = clamp((w.inn - w.out) * 0.012, -0.34, 0.34);
  w.av += ((target - w.ang) * 70 - w.av * 7) * dt;
  w.ang += w.av * dt;

  for (const d of w.drops) {
    if (t < d.t0) continue;
    d.vy += 1500 * dt; d.y += d.vy * dt;
    const p = g.pan(d.side);
    d.x += (p.x + d.dx - d.x) * Math.min(1, dt * 10);
    if (d.boom !== null && d.y >= d.boom) {
      w.booms.push({ x: d.x, y: d.y, t0: t, s: w.fix ? "ROLLBACK" : "CRASH", fill: w.fix ? C.lime : C.pink });
      d.t0 = Infinity;
      continue;
    }
    const n = d.side ? w.inn : w.out;
    const top = p.y + g.panDrop - 6 - Math.min(14, n / COIN) * 5;
    if (d.y >= top) {
      if (d.side) w.inn += COIN; else w.out += COIN;
      d.t0 = Infinity;
    }
  }
  w.drops = w.drops.filter((d) => d.t0 !== Infinity);
  w.booms = w.booms.filter((b) => t - b.t0 < 700);
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, s: Size, f: { d: string; m: string }) {
  const g = geo(w, s);
  ctx.fillStyle = C.yellow; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }

  // stand
  const base = s.H - 18;
  ctx.fillStyle = C.black; ctx.fillRect(g.cx - 7 + 5, g.cy + 5, 14, base - g.cy);
  ctx.fillStyle = C.lilac; ctx.fillRect(g.cx - 7, g.cy, 14, base - g.cy);
  ctx.strokeStyle = C.black; ctx.lineWidth = 3; ctx.strokeRect(g.cx - 7, g.cy, 14, base - g.cy);
  ctx.fillStyle = C.black; ctx.fillRect(g.cx - 60, base, 120, 10);

  // beam
  ctx.save(); ctx.translate(g.cx, g.cy); ctx.rotate(w.ang);
  ctx.fillStyle = C.black; ctx.fillRect(-g.L - 8, -6, g.L * 2 + 16, 12);
  ctx.restore();

  // pans + stacks
  ([0, 1] as const).forEach((side) => {
    const p = g.pan(side);
    ctx.strokeStyle = C.black; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 34, p.y + g.panDrop); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 34, p.y + g.panDrop); ctx.stroke();
    const n = Math.min(14, (side ? w.inn : w.out) / COIN);
    for (let k = 0; k < n; k++) {
      const y = p.y + g.panDrop - 6 - k * 5;
      ctx.fillStyle = C.black; ctx.fillRect(p.x - 20 + 2, y - 3 + 2, 40, 6);
      ctx.fillStyle = side ? C.lime : C.white; ctx.fillRect(p.x - 20, y - 3, 40, 6);
      ctx.strokeStyle = C.black; ctx.lineWidth = 1.5; ctx.strokeRect(p.x - 20, y - 3, 40, 6);
    }
    ctx.fillStyle = C.black; ctx.fillRect(p.x - 42, p.y + g.panDrop, 84, 8);
    const label = side ? "MERCHANT GOT" : "CUSTOMER PAID";
    text(ctx, label, p.x, p.y + g.panDrop + 24, `bold 9px ${f.m}`, C.black, "center");
    text(ctx, `$${side ? w.inn : w.out}`, p.x, p.y + g.panDrop + 48, `900 22px ${f.d}`, C.black, "center");
  });
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(g.cx, g.cy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.black; ctx.lineWidth = 3; ctx.stroke();

  for (const d of w.drops) if (t >= d.t0) coin(ctx, d.x, d.y, 10, 0, d.side ? C.lime : C.white, "$", f, 10);
  for (const b of w.booms) {
    const k = (t - b.t0) / 700;
    star(ctx, b.x, b.y, 14 + k * 14, b.fill);
    if (k < 0.8) tag(ctx, b.s, b.x - 30, b.y - 34, f, C.black, b.fill, 9);
  }
  const gap = w.out - w.inn;
  if (gap) tag(ctx, `$${gap} MISSING`, g.cx - 44, 14, f, C.pink, C.black, 10);
}

const snap = (w: World) => ({ out: w.out, inn: w.inn, rolled: w.rolled, fix: w.fix });

export default function ScaleGame() {
  const { canvas, snap: s, act } = useArena({ init: () => init(), step, draw, snap });
  const gap = s.out - s.inn;

  return (
    <Toy>
      <Stage canvas={canvas} label={`Customer paid $${s.out}, merchant got $${s.inn}`} onDown={() => act((w, t, sz) => pay(w, false, t, sz))} hint="tap to pay $30" />
      <Readout bad={gap !== 0}>
        {gap ? `$${gap} missing. Nobody can say where.` : s.rolled ? "Crash rolled back. Books balance." : s.out ? "Books balance to the cent" : "Pay a few times. Then crash."}
      </Readout>
      <Controls fix={<Switch on={s.fix} onClick={() => act((w) => Object.assign(w, init(!w.fix)))} label="one transaction" />}>
        <Btn onClick={() => act((w, t, sz) => pay(w, false, t, sz))}>Pay $30</Btn>
        <Btn tone="white" onClick={() => act((w, t, sz) => pay(w, true, t, sz))}>Pay + crash</Btn>
      </Controls>
    </Toy>
  );
}

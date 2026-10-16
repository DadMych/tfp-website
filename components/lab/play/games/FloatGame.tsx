"use client";

import { C, P, Size, coin, fall, fit, newPile, particle, rnd, star, tag, text, useArena } from "../arena";
import { Btn, Controls, Readout, Stage, Switch, Toy } from "../kit";

interface World {
  fix: boolean;
  n: number;
  f: number;
  wrong: number;
  coins: P[];
  pile: Float32Array;
  queue: number;
  pouring: boolean;
  lastDrop: number;
  pops: { t0: number; x: number }[];
}

const init = (fix = false): World => ({ fix, n: 0, f: 0, wrong: 0, coins: [], pile: newPile(), queue: 0, pouring: false, lastDrop: 0, pops: [] });

function jar(s: Size) {
  const w = Math.min(190, s.W * 0.62);
  return { x: (s.W - w) / 2, w, top: 112, floor: s.H - 14 };
}

function add(w: World, k: number, t: number, s: Size) {
  for (let i = 0; i < k; i++) {
    w.n++; w.f += 0.1;
    if (!w.fix && String(w.f) !== String(w.n / 10)) { w.wrong++; if (k === 1) w.pops.push({ t0: t, x: rnd(30, s.W - 30) }); }
  }
  w.queue += Math.min(k, 40);
}

function step(w: World, dt: number, t: number, s: Size) {
  const J = jar(s);
  if (w.pouring && t - w.lastDrop > 80) { add(w, 1, t, s); w.lastDrop = t; }
  if (w.queue > 0 && t - w.lastDrop > 25) {
    w.queue--; w.lastDrop = t;
    w.coins.push(particle(rnd(J.x + 14, J.x + J.w - 14), J.top - 40, rnd(-40, 40), rnd(0, 60), "coin", t));
  }
  let full = false;
  for (const c of w.coins) {
    fall(c, dt, w.pile, J.floor, 9, 6.5, J.x + 4, J.x + J.w - 4);
    if (c.rest && J.floor - c.y > J.floor - J.top - 6) full = true;
  }
  if (full) { w.coins = []; w.pile.fill(0); }
  w.pops = w.pops.filter((p) => t - p.t0 < 800);
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, s: Size, f: { d: string; m: string }) {
  const J = jar(s);
  ctx.fillStyle = C.pink; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }

  // the number
  tag(ctx, w.fix ? "total_cents BIGINT" : "let total = 0.0", 12, 12, f);
  const shown = w.fix ? `${(w.n * 10).toLocaleString("en-US")}¢` : String(w.f);
  const exact = w.fix ? shown : String(w.n / 10);
  let i = 0;
  while (i < shown.length && shown[i] === exact[i]) i++;
  const px = fit(ctx, shown, s.W - 28, 30, f.m, "bold");
  ctx.font = `bold ${px}px ${f.m}`;
  const head = shown.slice(0, i), tail = shown.slice(i);
  const hw = ctx.measureText(head).width, tw = ctx.measureText(tail).width;
  const y = 70;
  ctx.fillStyle = C.white; ctx.fillRect(12, y - px, Math.max(60, hw + tw + 16), px + 14);
  ctx.strokeStyle = C.black; ctx.lineWidth = 3; ctx.strokeRect(12, y - px, Math.max(60, hw + tw + 16), px + 14);
  text(ctx, head, 20, y, `bold ${px}px ${f.m}`);
  if (tail) { ctx.fillStyle = C.black; ctx.fillRect(20 + hw, y - px + 4, tw, px + 6); text(ctx, tail, 20 + hw, y, `bold ${px}px ${f.m}`, C.pink); }
  text(ctx, `SHOULD BE $${(w.n / 10).toFixed(2)}`, 14, y + 30, `bold 9px ${f.m}`, C.black);

  // jar
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(J.x, J.top, J.w, J.floor - J.top);
  for (const c of w.coins) coin(ctx, c.x, c.y, 9, c.rot, w.fix ? C.lime : C.yellow, "10", f, 8);
  ctx.strokeStyle = C.black; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(J.x, J.top - 8); ctx.lineTo(J.x, J.floor); ctx.lineTo(J.x + J.w, J.floor); ctx.lineTo(J.x + J.w, J.top - 8); ctx.stroke();
  ctx.fillStyle = C.black; ctx.fillRect(J.x - 8, J.top - 10, 16, 5); ctx.fillRect(J.x + J.w - 8, J.top - 10, 16, 5);

  for (const p of w.pops) {
    const k = (t - p.t0) / 800;
    const py = 120 - k * 30;
    ctx.globalAlpha = 1 - k;
    star(ctx, p.x, py, 13, C.black);
    text(ctx, "≠", p.x, py + 1, `bold 14px ${f.m}`, C.pink, "center", "middle");
    ctx.globalAlpha = 1;
  }
}

const snap = (w: World) => ({ n: w.n, wrong: w.wrong, fix: w.fix });

export default function FloatGame() {
  const { canvas, snap: s, act } = useArena({ init: () => init(), step, draw, snap });

  return (
    <Toy>
      <Stage
        canvas={canvas}
        label={`${s.n} dimes added, ${s.wrong} totals were wrong`}
        onDown={() => act((w, t, sz) => { w.pouring = true; w.lastDrop = t; add(w, 1, t, sz); })}
        onUp={() => act((w) => { w.pouring = false; })}
        hint="hold to pour dimes"
      />
      <Readout bad={!s.fix && s.wrong > 0}>
        {s.n === 0 ? "Drop a dime in the jar. Then another." : s.fix ? `${s.n.toLocaleString("en-US")} dimes. Zero wrong.` : `${s.wrong.toLocaleString("en-US")} of ${s.n.toLocaleString("en-US")} totals were wrong`}
      </Readout>
      <Controls fix={<Switch on={s.fix} onClick={() => act((w) => Object.assign(w, init(!w.fix)))} label="integer cents" />}>
        <Btn onClick={() => act((w, t, sz) => add(w, 1, t, sz))}>+ 10¢</Btn>
        <Btn tone="white" onClick={() => act((w, t, sz) => add(w, 1000, t, sz))}>Pour 1000</Btn>
      </Controls>
    </Toy>
  );
}

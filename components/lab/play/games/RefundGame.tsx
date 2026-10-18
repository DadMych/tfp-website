"use client";

import { C, P, Size, bill, box, coin, ease, fall, newPile, particle, rnd, star, tag, text, useArena } from "../arena";
import { Btn, Controls, Readout, Stage, Switch, Toy } from "../kit";

const STATES = ["CREATED", "PAID", "REFUNDED"] as const;
const FLY = 380;

interface Shot { from: 0 | 1; t0: number; done: boolean; back: number }
interface World {
  guard: boolean;
  st: 0 | 1 | 2;
  refunded: number;
  refused: number;
  shots: Shot[];
  bills: P[];
  pile: Float32Array;
  pops: { t0: number; s: string; fill: string }[];
  pulse: number;
}

const init = (guard = false): World => ({ guard, st: 0, refunded: 0, refused: 0, shots: [], bills: [], pile: newPile(), pops: [], pulse: -1e9 });

function layout(s: Size) {
  const ag = { x: 12, w: 54, h: 40 };
  const ow = Math.min(150, s.W * 0.44);
  const od = { x: Math.max(ag.x + ag.w + 44, s.W * 0.5 - ow / 2 + 6), y: 40, w: ow, h: 112 };
  return { ag, agY: [44, 112] as const, od, floor: s.H - 12 };
}

function fire(w: World, from: 0 | 1, t: number) {
  w.shots.push({ from, t0: t, done: false, back: 0 });
}

function step(w: World, dt: number, t: number, s: Size) {
  const L = layout(s);
  for (const sh of w.shots) {
    if (sh.done || t < sh.t0) continue;
    if (!sh.back && t - sh.t0 >= FLY) {
      const ok = w.guard ? w.st === 1 : w.st >= 1;
      if (ok) {
        w.st = 2; w.refunded += 50; w.pulse = t; sh.done = true;
        for (let i = 0; i < 5; i++) w.bills.push(particle(L.od.x + L.od.w / 2, L.od.y + L.od.h, rnd(-120, 160), rnd(-360, -120), "bill", t));
        if (w.refunded > 50) w.pops.push({ t0: t, s: `+$${w.refunded - 50} EXTRA`, fill: C.pink });
      } else {
        sh.back = t;
        if (w.guard) { w.refused++; w.pops.push({ t0: t, s: "409 REFUSED", fill: C.lime }); }
        else w.pops.push({ t0: t, s: "NOTHING TO REFUND", fill: C.white });
      }
    }
    if (sh.back && t - sh.back > 300) sh.done = true;
  }
  w.shots = w.shots.filter((x) => !x.done);
  w.pops = w.pops.filter((p) => t - p.t0 < 900);
  for (const b of w.bills) fall(b, dt, w.pile, L.floor, 8, 8, s.W * 0.5, s.W - 4);
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, s: Size, f: { d: string; m: string }) {
  const L = layout(s);
  ctx.fillStyle = C.orange; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }

  // agents
  L.agY.forEach((y, i) => {
    box(ctx, L.ag.x, y, L.ag.w, L.ag.h, C.white, 4);
    text(ctx, `AGENT ${i ? "B" : "A"}`, L.ag.x + L.ag.w / 2, y + 16, `bold 8px ${f.m}`, C.black, "center");
    text(ctx, "REFUND", L.ag.x + L.ag.w / 2, y + 30, `bold 9px ${f.m}`, C.red, "center");
  });

  // order
  const shake = t - w.pulse < 250 ? Math.sin(t / 15) * 3 : 0;
  const ox = L.od.x + shake;
  box(ctx, ox, L.od.y, L.od.w, L.od.h, w.refunded > 50 ? C.pink : C.white);
  tag(ctx, "ORDER #4471 · $50", ox, L.od.y - 22, f);
  STATES.forEach((name, i) => {
    const y = L.od.y + 12 + i * 32;
    const on = i === w.st;
    ctx.fillStyle = on ? C.yellow : C.cream; ctx.fillRect(ox + 10, y, L.od.w - 20, 24);
    ctx.lineWidth = on ? 3 : 1.5; ctx.strokeStyle = C.black; ctx.strokeRect(ox + 10, y, L.od.w - 20, 24);
    text(ctx, name, ox + 18, y + 13, `bold 10px ${f.m}`, C.black, "left", "middle");
    if (on) text(ctx, "●", ox + L.od.w - 20, y + 13, `bold 10px ${f.m}`, C.black, "center", "middle");
  });
  if (w.guard && w.st !== 1) {
    ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.setLineDash([8, 5]);
    ctx.strokeRect(ox - 8, L.od.y - 8, L.od.w + 16, L.od.h + 16); ctx.setLineDash([]);
  }

  // shots
  for (const sh of w.shots) {
    if (t < sh.t0) continue;
    const ax = L.ag.x + L.ag.w + 10, ay = L.agY[sh.from] + L.ag.h / 2;
    const bx = ox - 14, by = L.od.y + L.od.h / 2;
    let k = ease((t - sh.t0) / FLY);
    if (sh.back) k = 1 - ease((t - sh.back) / 300);
    coin(ctx, ax + (bx - ax) * k, ay + (by - ay) * k, 11, 0, sh.back ? C.white : C.yellow, "↩", f, 12);
  }

  // customer wallet
  ctx.fillStyle = C.black; ctx.fillRect(0, L.floor, s.W, s.H - L.floor);
  text(ctx, "CUSTOMER GOT BACK", 12, s.H - 56, `bold 9px ${f.m}`);
  text(ctx, `$${w.refunded}`, 12, s.H - 22, `900 32px ${f.d}`, w.refunded > 50 ? C.white : C.black);
  for (const b of w.bills) bill(ctx, b.x, b.y, b.rot);

  for (const p of w.pops) {
    const k = (t - p.t0) / 900;
    const y = L.od.y + L.od.h + 30 - k * 16;
    ctx.globalAlpha = 1 - k * 0.8;
    star(ctx, ox + L.od.w / 2, y, 14, p.fill);
    tag(ctx, p.s, ox + L.od.w / 2 - 50, y + 12, f, p.fill, C.black, 9);
    ctx.globalAlpha = 1;
  }
}

const snap = (w: World) => ({ st: w.st, refunded: w.refunded, refused: w.refused, guard: w.guard });

export default function RefundGame() {
  const { canvas, snap: s, act, local } = useArena({ init: () => init(), step, draw, snap });

  return (
    <Toy>
      <Stage
        canvas={canvas}
        label={`Order is ${STATES[s.st].toLowerCase()}, refunded $${s.refunded} on a $50 order`}
        onDown={(e) => { const p = local(e); act((w, t) => fire(w, p.y > 100 ? 1 : 0, t)); }}
        hint="click to refund"
      />
      <Readout bad={s.refunded > 50}>
        {s.refunded > 50 ? `Refunded $${s.refunded} on a $50 order` : s.st === 0 ? "Pay first. Then have both agents refund." : s.st === 1 ? "Paid. Now both agents press refund." : s.refused ? `Refunded once. ${s.refused} refused.` : "Refunded once. Try again."}
      </Readout>
      <Controls fix={<Switch on={s.guard} onClick={() => act((w) => Object.assign(w, init(!w.guard)))} label="state guard" />}>
        <Btn onClick={() => act((w, t) => { if (w.st === 0) { w.st = 1; w.pulse = t; } })}>Pay $50</Btn>
        <Btn tone="white" onClick={() => act((w, t) => { fire(w, 0, t); fire(w, 1, t + 30); })}>Both refund</Btn>
      </Controls>
    </Toy>
  );
}

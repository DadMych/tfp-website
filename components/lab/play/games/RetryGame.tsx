"use client";

import { C, P, Size, box, coin, fall, newPile, particle, rnd, star, tag, text, useArena } from "../arena";
import { Btn, Controls, Readout, Stage, Switch, Toy } from "../kit";

const LOSS = 0.6;
const MAX_TRIES = 5;
const TRAVEL = 450;

interface Pkt { intent: number; tries: number; dir: "req" | "res"; t0: number; lost: boolean; done: boolean }
interface World {
  key: boolean;
  intents: number;
  charges: number;
  seen: Set<number>;
  ok: Set<number>;
  pk: Pkt[];
  retries: { intent: number; tries: number; at: number }[];
  pops: { x: number; y: number; t0: number; s: string; fill: string }[];
  receipts: P[];
  pile: Float32Array;
  flash: number;
  hit: number;
  last: { intent: number; tries: number } | null;
}

const init = (key = false): World => ({
  key, intents: 0, charges: 0, seen: new Set(), ok: new Set(), pk: [], retries: [], pops: [], receipts: [], pile: newPile(), flash: -1e9, hit: -1e9, last: null,
});

function layout(s: Size) {
  const floor = s.H - 12;
  const ph = { x: 16, y: 34, w: 62, h: 108 };
  const sw = Math.min(124, s.W * 0.36);
  const sv = { x: s.W - sw - 18, y: 34, w: sw, h: 92 };
  return { floor, ph, sv, req: ph.y + 34, res: ph.y + 74 };
}

function send(w: World, intent: number, tries: number, t: number) {
  w.pk.push({ intent, tries, dir: "req", t0: t, lost: false, done: false });
  w.last = { intent, tries };
}

function step(w: World, dt: number, t: number, s: Size) {
  const L = layout(s);
  for (const r of w.retries.filter((r) => r.at <= t)) send(w, r.intent, r.tries, t);
  w.retries = w.retries.filter((r) => r.at > t);

  for (const p of w.pk) {
    if (p.done) continue;
    const k = (t - p.t0) / TRAVEL;
    if (p.dir === "req" && k >= 1) {
      p.done = true;
      if (!w.key || !w.seen.has(p.intent)) {
        w.seen.add(p.intent); w.charges++; w.flash = t;
        w.receipts.push(particle(L.sv.x + L.sv.w / 2, L.sv.y + L.sv.h, rnd(-260, 120), rnd(-380, -160), "receipt", t));
      } else {
        w.hit = t;
      }
      const lost = p.tries < MAX_TRIES && Math.random() < LOSS;
      w.pk.push({ intent: p.intent, tries: p.tries, dir: "res", t0: t, lost, done: false });
    } else if (p.dir === "res") {
      if (p.lost && k >= 0.5) {
        p.done = true;
        const x = (L.ph.x + L.ph.w + L.sv.x) / 2;
        w.pops.push({ x, y: L.res, t0: t, s: "TIMEOUT", fill: C.pink });
        w.retries.push({ intent: p.intent, tries: p.tries + 1, at: t + 320 });
      } else if (k >= 1) {
        p.done = true;
        w.ok.add(p.intent);
      }
    }
  }
  w.pk = w.pk.filter((p) => !p.done);
  w.pops = w.pops.filter((p) => t - p.t0 < 700);
  for (const r of w.receipts) fall(r, dt, w.pile, L.floor, 8, 9, 0, s.W);
  if (w.receipts.length > 220) w.receipts.splice(0, w.receipts.length - 220);
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, s: Size, f: { d: string; m: string }) {
  const L = layout(s);
  ctx.fillStyle = C.blue; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }

  // wires
  ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2;
  for (const y of [L.req, L.res]) { ctx.beginPath(); ctx.moveTo(L.ph.x + L.ph.w, y); ctx.lineTo(L.sv.x, y); ctx.stroke(); }
  ctx.setLineDash([]);
  text(ctx, "PAY →", L.ph.x + L.ph.w + 8, L.req - 8, `bold 9px ${f.m}`, C.cream);
  text(ctx, "← 200 OK", L.ph.x + L.ph.w + 8, L.res + 16, `bold 9px ${f.m}`, C.cream);

  // phone
  box(ctx, L.ph.x, L.ph.y, L.ph.w, L.ph.h, C.white);
  ctx.fillStyle = C.black; ctx.fillRect(L.ph.x + 22, L.ph.y + 6, 18, 4);
  const st = w.last ? (w.ok.has(w.last.intent) ? "PAID" : w.last.tries > 1 ? `TRY ${w.last.tries}` : "…") : "BUY";
  text(ctx, "$20", L.ph.x + L.ph.w / 2, L.ph.y + 48, `900 20px ${f.d}`, C.black, "center");
  text(ctx, st, L.ph.x + L.ph.w / 2, L.ph.y + 70, `bold 10px ${f.m}`, st === "PAID" ? "#1a7f00" : C.black, "center");
  text(ctx, "TICKET", L.ph.x + L.ph.w / 2, L.ph.y + 94, `bold 8px ${f.m}`, C.black, "center");

  // server
  const lit = t - w.flash < 220;
  box(ctx, L.sv.x, L.sv.y, L.sv.w, L.sv.h, lit ? C.pink : t - w.hit < 220 ? C.lime : C.white);
  tag(ctx, "POST /charge", L.sv.x, L.sv.y - 22, f);
  text(ctx, "CARD CHARGED", L.sv.x + 10, L.sv.y + 22, `bold 9px ${f.m}`);
  text(ctx, `${w.charges}×`, L.sv.x + 10, L.sv.y + 62, `900 34px ${f.d}`);
  if (w.key) text(ctx, `KEYS SEEN ${w.seen.size}`, L.sv.x + 10, L.sv.y + 82, `bold 9px ${f.m}`);

  // packets
  for (const p of w.pk) {
    if (t < p.t0) continue;
    const k = Math.min(1, (t - p.t0) / TRAVEL);
    const a = L.ph.x + L.ph.w + 10, b = L.sv.x - 10;
    const x = p.dir === "req" ? a + (b - a) * k : b - (b - a) * k;
    const y = p.dir === "req" ? L.req : L.res;
    if (p.dir === "req") coin(ctx, x, y, 10, 0, C.yellow, w.key ? `k${p.intent}` : "$", f, w.key ? 8 : 11);
    else { ctx.fillStyle = C.black; ctx.fillRect(x - 13, y - 7, 28, 16); ctx.fillStyle = C.white; ctx.fillRect(x - 15, y - 9, 28, 16); ctx.strokeStyle = C.black; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 9, 28, 16); text(ctx, "200", x - 1, y, `bold 9px ${f.m}`, C.black, "center", "middle"); }
  }
  for (const p of w.pops) {
    const k = (t - p.t0) / 700;
    star(ctx, p.x, p.y, 16 + k * 10, p.fill);
    text(ctx, p.s, p.x, p.y - 24 - k * 10, `bold 10px ${f.m}`, C.cream, "center");
  }

  // receipts pile
  ctx.fillStyle = C.black; ctx.fillRect(0, L.floor, s.W, s.H - L.floor);
  for (const r of w.receipts) {
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.fillStyle = C.black; ctx.fillRect(-11, -6, 24, 15);
    ctx.fillStyle = C.white; ctx.fillRect(-13, -8, 24, 15); ctx.strokeStyle = C.black; ctx.lineWidth = 2; ctx.strokeRect(-13, -8, 24, 15);
    text(ctx, "$20", -1, 0, `bold 8px ${f.m}`, C.red, "center", "middle");
    ctx.restore();
  }
}

const snap = (w: World) => ({ intents: w.intents, charges: w.charges, key: w.key });

export default function RetryGame() {
  const { canvas, snap: s, act } = useArena({ init: () => init(), step, draw, snap });
  const buy = (n: number) => act((w, t) => { for (let i = 0; i < n; i++) { w.intents++; send(w, w.intents, 1, t + i * 140); } });

  return (
    <Toy>
      <Stage canvas={canvas} label={`Bought ${s.intents} tickets, card charged ${s.charges} times`} onDown={() => buy(1)} hint="tap to buy" />
      <Readout bad={s.charges > s.intents}>
        {s.intents === 0 ? "Buy one ticket. The signal is bad." : s.charges > s.intents ? `Bought ${s.intents}. Charged ${s.charges}× = $${s.charges * 20}` : `Bought ${s.intents}. Charged ${s.charges}×.`}
      </Readout>
      <Controls fix={<Switch on={s.key} onClick={() => act((w) => Object.assign(w, init(!w.key)))} label="idempotency key" />}>
        <Btn onClick={() => buy(1)}>Buy ticket</Btn>
        <Btn tone="white" onClick={() => buy(5)}>Buy ×5</Btn>
      </Controls>
    </Toy>
  );
}

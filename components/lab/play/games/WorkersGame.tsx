"use client";

import { C, P, Size, bill, box, fall, newPile, particle, rnd, tag, text, useArena } from "../arena";
import { Btn, Controls, Readout, Stage, Switch, Toy } from "../kit";

const PAYOUTS = [["Anna", 50], ["Ben", 40], ["Chen", 60], ["Dana", 50], ["Eli", 30], ["Fay", 70]] as const;
const DUE = PAYOUTS.reduce((a, [, v]) => a + v, 0);
const HOP = 260;
const WORK = 220;

type Id = "A" | "B";
interface Bot { id: Id; x: number; tx: number; plan: number[]; at: number; busy: number | null }
interface World {
  skip: boolean;
  two: boolean;
  bots: Bot[];
  locks: (Id | null)[];
  paid: Id[][];
  bills: P[];
  piles: Float32Array;
  running: boolean;
}

const init = (skip = false, two = false): World => ({
  skip, two, bots: [], locks: PAYOUTS.map(() => null), paid: PAYOUTS.map(() => []), bills: [], piles: newPile(), running: false,
});

function layout(s: Size) {
  const n = PAYOUTS.length;
  const tw = (s.W - 24 - (n - 1) * 6) / n;
  return { tw, ty: 92, th: 70, tx: (i: number) => 12 + i * (tw + 6), floor: s.H - 12, botY: 34 };
}

function run(w: World, t: number, s: Size) {
  const L = layout(s);
  w.locks = PAYOUTS.map(() => null); w.paid = PAYOUTS.map(() => []); w.bills = []; w.piles.fill(0);
  const all = PAYOUTS.map((_, i) => i);
  const ids: Id[] = w.two ? ["A", "B"] : ["A"];
  w.bots = ids.map((id, k) => ({ id, x: L.tx(0) + k * 18, tx: L.tx(0), plan: w.skip ? [] : [...all], at: t + 200 + k * 90, busy: null }));
  w.running = true;
}

function nextFree(w: World): number {
  return w.locks.findIndex((l, i) => l === null && w.paid[i].length === 0);
}

function step(w: World, dt: number, t: number, s: Size) {
  const L = layout(s);
  for (const b of w.bots) {
    b.x += (b.tx - b.x) * Math.min(1, dt * 12);
    if (t < b.at) continue;
    if (b.busy !== null) {
      const i = b.busy;
      w.paid[i].push(b.id);
      w.locks[i] = null;
      const cx = L.tx(i) + L.tw / 2;
      w.bills.push(particle(cx + rnd(-4, 4), L.ty + L.th, rnd(-30, 30), rnd(-60, 0), "bill", t));
      b.busy = null; b.at = t + 60;
      continue;
    }
    let i = -1;
    if (w.skip) { i = nextFree(w); if (i >= 0) w.locks[i] = b.id; }
    else i = b.plan.shift() ?? -1;
    if (i < 0) { b.at = Infinity; continue; }
    b.busy = i; b.tx = L.tx(i) + L.tw / 2 - 12 + (w.two && !w.skip && b.id === "B" ? 10 : 0); b.at = t + HOP + WORK;
  }
  if (w.running && w.bots.length && w.bots.every((b) => b.at === Infinity)) w.running = false;
  for (const b of w.bills) fall(b, dt, w.piles, L.floor, 8, 9, 0, s.W);
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, s: Size, f: { d: string; m: string }) {
  const L = layout(s);
  ctx.fillStyle = C.yellow; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }

  tag(ctx, w.skip ? "WHERE status='due' FOR UPDATE SKIP LOCKED" : "SELECT … WHERE status='due'", 12, 8, f, C.black, w.skip ? C.lime : C.yellow, 9);

  PAYOUTS.forEach(([name, amt], i) => {
    const x = L.tx(i), n = w.paid[i].length;
    box(ctx, x, L.ty, L.tw, L.th, n > 1 ? C.pink : n ? C.lime : C.white, 4);
    text(ctx, name.toUpperCase(), x + 6, L.ty + 14, `bold 9px ${f.m}`);
    text(ctx, `$${amt}`, x + 6, L.ty + 38, `900 ${L.tw < 52 ? 16 : 20}px ${f.d}`);
    text(ctx, n ? `PAID ${n}×` : "DUE", x + 6, L.ty + L.th - 9, `bold 8px ${f.m}`, n > 1 ? C.black : "rgba(0,0,0,0.6)");
    const lk = w.locks[i];
    if (lk) {
      ctx.fillStyle = C.black; ctx.fillRect(x + L.tw - 18, L.ty - 8, 16, 14);
      ctx.strokeStyle = C.black; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + L.tw - 10, L.ty - 8, 5, Math.PI, 0); ctx.stroke();
      text(ctx, lk, x + L.tw - 10, L.ty, `bold 8px ${f.m}`, C.yellow, "center", "middle");
    }
  });

  for (const b of w.bots) {
    const bob = b.busy !== null ? Math.sin(t / 60) * 2 : 0;
    const x = b.x, y = L.botY + bob;
    box(ctx, x, y, 24, 24, b.id === "A" ? C.blue : C.orange, 3, 2.5);
    ctx.fillStyle = C.white; ctx.fillRect(x + 5, y + 7, 5, 5); ctx.fillRect(x + 14, y + 7, 5, 5);
    text(ctx, b.id, x + 12, y + 20, `bold 8px ${f.m}`, C.white, "center");
    ctx.strokeStyle = C.black; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 12, y + 24); ctx.lineTo(x + 12, L.ty); ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  }

  ctx.fillStyle = C.black; ctx.fillRect(0, L.floor, s.W, s.H - L.floor);
  const paid = w.paid.reduce((a, x, i) => a + x.length * PAYOUTS[i][1], 0);
  text(ctx, `PAID OUT $${paid} OF $${DUE}`, 12, L.floor - 8, `bold 10px ${f.m}`, paid > DUE ? C.red : C.black);
  for (const b of w.bills) bill(ctx, b.x, b.y, b.rot);
}

const snap = (w: World) => ({
  skip: w.skip, two: w.two, running: w.running, paid: w.paid.reduce((a, x, i) => a + x.length * PAYOUTS[i][1], 0), started: w.bots.length > 0,
});

export default function WorkersGame() {
  const { canvas, snap: s, act } = useArena({ init: () => init(), step, draw, snap });

  return (
    <Toy>
      <Stage canvas={canvas} label={`Paid out $${s.paid} of $${DUE} due`} onDown={() => act((w, t, sz) => run(w, t, sz))} hint="tap to run the job" />
      <Readout bad={s.paid > DUE}>
        {!s.started ? `$${DUE} due to six people. Run the job.` : s.running ? "Paying…" : s.paid > DUE ? `Paid $${s.paid} on $${DUE} due. Everyone got it twice.` : `Paid $${s.paid}. Once each.`}
      </Readout>
      <Controls fix={<Switch on={s.skip} onClick={() => act((w) => Object.assign(w, init(!w.skip, w.two)))} label="for update skip locked" />}>
        <Btn onClick={() => act((w, t, sz) => run(w, t, sz))}>Run payout job</Btn>
        <Btn tone="white" onClick={() => act((w) => Object.assign(w, init(w.skip, !w.two)))}>{s.two ? "2 workers" : "1 worker"}</Btn>
      </Controls>
    </Toy>
  );
}

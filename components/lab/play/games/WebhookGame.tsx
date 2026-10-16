"use client";

import { C, Size, box, ease, star, tag, text, useArena } from "../arena";
import { Btn, Controls, Readout, Stage, Switch, Toy } from "../kit";

type Ev = "authorized" | "captured";
const RANK: Record<Ev, number> = { authorized: 1, captured: 2 };
const FLY = 420;

interface Env { id: number; ev: Ev; st: "belt" | "fly" | "in" | "trash"; t0: number; sx: number; sy: number }
interface World {
  fix: boolean;
  belt: Env[];
  status: Ev | null;
  max: number;
  sawCaptured: boolean;
  flip: number;
  auto: number[];
  pops: { t0: number; s: string; fill: string }[];
}

const BATCH: Ev[] = ["authorized", "captured", "captured", "authorized"];
const init = (fix = false): World => ({
  fix, belt: BATCH.map((ev, i) => ({ id: i + 1, ev, st: "belt", t0: 0, sx: 0, sy: 0 })), status: null, max: 0, sawCaptured: false, flip: -1e9, auto: [], pops: [],
});

function layout(s: Size) {
  const ew = Math.min(64, (s.W - 32) / 4 - 8), eh = 42;
  const beltY = 40;
  const hb = { x: 14, y: s.H - 104, w: Math.min(220, s.W * 0.46), h: 90 };
  const sg = { x: hb.x + hb.w + 14, y: s.H - 136, w: s.W - hb.x - hb.w - 28, h: 122 };
  return { ew, eh, beltY, hb, sg, slot: (i: number) => 16 + i * (ew + 8) };
}

function deliver(w: World, id: number, t: number, s: Size) {
  const L = layout(s);
  const i = w.belt.findIndex((e) => e.id === id && e.st === "belt");
  if (i < 0) return;
  const e = w.belt[i];
  e.st = "fly"; e.t0 = t; e.sx = L.slot(i); e.sy = L.beltY;
}

function step(w: World, _dt: number, t: number, s: Size) {
  if (w.auto.length && w.belt.every((e) => e.st !== "fly")) {
    const id = w.auto.shift()!;
    deliver(w, id, t, s);
  }
  for (const e of w.belt) {
    if (e.st !== "fly" || t - e.t0 < FLY) continue;
    const apply = !w.fix || RANK[e.ev] > w.max;
    if (apply) {
      e.st = "in";
      if (w.status !== e.ev) w.flip = t;
      w.status = e.ev; w.max = Math.max(w.max, RANK[e.ev]);
      if (e.ev === "captured") w.sawCaptured = true;
      if (w.sawCaptured && e.ev === "authorized") w.pops.push({ t0: t, s: "LOOKS UNPAID", fill: C.pink });
    } else {
      e.st = "trash"; e.t0 = t;
      w.pops.push({ t0: t, s: "LATE · IGNORED", fill: C.lime });
    }
  }
  w.pops = w.pops.filter((p) => t - p.t0 < 900);
}

function envelope(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: Env, f: { d: string; m: string }, dim = false) {
  ctx.globalAlpha = dim ? 0.35 : 1;
  box(ctx, x, y, w, h, e.ev === "captured" ? C.lime : C.yellow, 4, 2.5);
  ctx.strokeStyle = C.black; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w / 2, y + h * 0.45); ctx.lineTo(x + w, y); ctx.stroke();
  text(ctx, e.ev === "captured" ? "CAPT" : "AUTH", x + w / 2, y + h - 9, `bold 10px ${f.m}`, C.black, "center");
  text(ctx, `#${e.id}`, x + 4, y + 11, `bold 8px ${f.m}`);
  ctx.globalAlpha = 1;
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, s: Size, f: { d: string; m: string }) {
  const L = layout(s);
  ctx.fillStyle = C.blue; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }

  // belt
  tag(ctx, "PROVIDER → YOUR ENDPOINT", 12, 8, f);
  const by = L.beltY + L.eh + 6;
  ctx.fillStyle = C.black; ctx.fillRect(0, by, s.W, 10);
  for (let x = ((t / 30) % 20) - 20; x < s.W; x += 20) { ctx.fillStyle = C.cream; ctx.fillRect(x, by + 3, 8, 4); }
  w.belt.forEach((e, i) => { if (e.st === "belt") envelope(ctx, L.slot(i), L.beltY, L.ew, L.eh, e, f); });

  // handler
  box(ctx, L.hb.x, L.hb.y, L.hb.w, L.hb.h, C.white);
  tag(ctx, w.fix ? "HANDLER · FORWARD ONLY" : "HANDLER · LAST WRITE WINS", L.hb.x, L.hb.y - 22, f, C.black, w.fix ? C.lime : C.yellow, 9);
  const inside = w.belt.filter((e) => e.st === "in");
  inside.forEach((e, k) => envelope(ctx, L.hb.x + 8 + k * 16, L.hb.y + 10 + k * 6, Math.min(L.ew, 52), 34, e, f, k < inside.length - 1));
  if (!inside.length) text(ctx, "CLICK AN ENVELOPE", L.hb.x + L.hb.w / 2, L.hb.y + L.hb.h / 2 + 3, `bold 9px ${f.m}`, "rgba(0,0,0,0.45)", "center", "middle");

  // status sign, flips on change
  const k = Math.min(1, (t - w.flip) / 260);
  const sy = Math.abs(Math.cos(k * Math.PI));
  const wrong = w.sawCaptured && w.status === "authorized";
  const fill = !w.status ? C.cream : wrong ? C.pink : w.status === "captured" ? C.lime : C.yellow;
  ctx.save(); ctx.translate(L.sg.x + L.sg.w / 2, L.sg.y + L.sg.h / 2); ctx.scale(1, k < 1 ? Math.max(0.05, sy) : 1);
  box(ctx, -L.sg.w / 2, -L.sg.h / 2, L.sg.w, L.sg.h, fill);
  text(ctx, "ORDER", 0, -L.sg.h / 2 + 18, `bold 9px ${f.m}`, C.black, "center");
  const word = w.status ? (w.status === "captured" ? "PAID" : "UNPAID") : "—";
  const px = Math.min(30, (L.sg.w - 12) / (word.length * 0.62));
  text(ctx, word, 0, 6, `900 ${px}px ${f.d}`, C.black, "center", "middle");
  text(ctx, w.status ?? "waiting", 0, L.sg.h / 2 - 12, `bold 9px ${f.m}`, C.black, "center");
  ctx.restore();

  // flying + trash
  for (const e of w.belt) {
    if (e.st === "fly") {
      const q = ease((t - e.t0) / FLY);
      const x = e.sx + (L.hb.x + 10 - e.sx) * q, y = e.sy + (L.hb.y + 10 - e.sy) * q - Math.sin(q * Math.PI) * 30;
      envelope(ctx, x, y, L.ew, L.eh, e, f);
    } else if (e.st === "trash") {
      const q = (t - e.t0) / 700;
      if (q < 1) {
        ctx.save(); ctx.translate(L.hb.x + L.hb.w * 0.6 + q * 60, L.hb.y + q * q * 200); ctx.rotate(q * 3);
        envelope(ctx, -L.ew / 2, -L.eh / 2, L.ew, L.eh, e, f, true);
        ctx.restore();
      }
    }
  }

  for (const p of w.pops) {
    const q = (t - p.t0) / 900;
    ctx.globalAlpha = 1 - q * 0.7;
    star(ctx, L.sg.x + L.sg.w / 2, L.sg.y - 10 - q * 10, 12, p.fill);
    tag(ctx, p.s, Math.max(4, L.sg.x + L.sg.w / 2 - 54), L.sg.y - 34 - q * 10, f, p.fill, C.black, 9);
    ctx.globalAlpha = 1;
  }
}

const snap = (w: World) => ({
  fix: w.fix, status: w.status, wrong: w.sawCaptured && w.status === "authorized", left: w.belt.filter((e) => e.st === "belt").length,
});

export default function WebhookGame() {
  const { canvas, snap: s, act, local } = useArena({ init: () => init(), step, draw, snap });

  const click = (e: React.PointerEvent) => {
    const p = local(e);
    act((w, t, sz) => {
      const L = layout(sz);
      w.belt.forEach((env, i) => {
        if (env.st === "belt" && p.x >= L.slot(i) && p.x <= L.slot(i) + L.ew && p.y >= L.beltY && p.y <= L.beltY + L.eh) deliver(w, env.id, t, sz);
      });
    });
  };

  const shuffle = () =>
    act((w) => {
      const ids = w.belt.filter((e) => e.st === "belt").map((e) => e.id);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      const capt = ids.filter((id) => w.belt[id - 1].ev === "captured");
      const auth = ids.filter((id) => w.belt[id - 1].ev === "authorized");
      w.auto = auth.length && capt.length ? [...ids.filter((id) => id !== auth[auth.length - 1]), auth[auth.length - 1]] : ids;
    });

  return (
    <Toy>
      <Stage canvas={canvas} label={`Order status: ${s.status ?? "waiting"}`} onDown={click} />
      <Readout bad={s.wrong}>
        {s.wrong ? "Order looks unpaid. It was paid." : s.left === 4 ? "Deliver envelopes in any order. Make the paid order look unpaid." : s.fix && s.status === "captured" ? "Paid. Late mail goes in the bin." : s.left === 0 ? "All delivered. New batch?" : `Status: ${s.status ?? "waiting"}`}
      </Readout>
      <Controls fix={<Switch on={s.fix} onClick={() => act((w) => Object.assign(w, init(!w.fix)))} label="only move forward" />}>
        <Btn onClick={shuffle}>Deliver the rest</Btn>
        <Btn tone="white" onClick={() => act((w) => Object.assign(w, init(w.fix)))}>New batch</Btn>
      </Controls>
    </Toy>
  );
}

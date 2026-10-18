"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "naive" | "check" | "lock";

const MODES: { id: Mode; n: string; name: string; sub: string; bg: string }[] = [
  { id: "naive", n: "Defence 0", name: "No lock", sub: "read, think, write", bg: "#FF5CAA" },
  { id: "check", n: "Defence 1", name: "CHECK ≥ 0", sub: "the row refuses to go negative", bg: "#FF8A3D" },
  { id: "lock", n: "Defence 2", name: "Row lock", sub: "one payment at a time", bg: "#C6FF3D" },
];

const AMT = 1000;
const START = 10000;
const R = 11;
const G = 1700;

const C = {
  bg: "#3B5BFF",
  grid: "rgba(255,255,255,0.09)",
  cream: "#FFFDF5",
  black: "#000000",
  yellow: "#FFE600",
  lime: "#C6FF3D",
  pink: "#FF5CAA",
  red: "#FF3B30",
};

interface Coin {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  s: "fly" | "queue" | "inside" | "drop" | "rest";
  until: number; read: number; kind: "coin" | "bill" | "reject";
}

interface World {
  W: number; H: number;
  mode: Mode;
  balance: number; paid: number;
  coins: Coin[];
  queue: Coin[];
  holder: Coin | null;
  heights: Float32Array;
  flash: number;
  firing: boolean; px: number; py: number; lastFire: number;
}

const BIN = 6;

function geom(w: World) {
  const floor = w.H - 22;
  const small = w.W < 640;
  const vw = small ? w.W * 0.42 : Math.min(300, w.W * 0.26);
  const vx = w.W - vw - (small ? 18 : 28);
  const vy = small ? 150 : 70;
  const vh = floor - vy - (small ? 60 : 70);
  const gx = vx - 16;
  const gy = vy + vh * 0.62;
  return { floor, vx, vy, vw, vh, gx, gy };
}

function fresh(W: number, H: number, mode: Mode): World {
  return {
    W, H, mode, balance: START, paid: 0, coins: [], queue: [], holder: null,
    heights: new Float32Array(Math.ceil(W / BIN) + 2), flash: 0,
    firing: false, px: 0, py: 0, lastFire: 0,
  };
}

function spawn(w: World, x: number, y: number) {
  const { gx, gy } = geom(w);
  const sx = Math.min(x, gx - 60);
  const dx = gx - sx, dy = gy - y;
  const d = Math.hypot(dx, dy) || 1;
  const sp = 620 + Math.random() * 160;
  w.coins.push({ x: sx, y, vx: (dx / d) * sp, vy: (dy / d) * sp, rot: 0, vr: (Math.random() - 0.5) * 10, s: "fly", until: 0, read: 0, kind: "coin" });
}

function burst(w: World, n: number) {
  const { floor } = geom(w);
  for (let i = 0; i < n; i++) {
    const delay = i * 22;
    setTimeout(() => spawn(w, -10, 60 + Math.random() * (floor - 140)), delay);
  }
}

function payout(w: World, x: number, y: number) {
  w.paid += AMT;
  w.coins.push({ x, y, vx: -(380 + Math.random() * 520), vy: -(380 + Math.random() * 340), rot: 0, vr: (Math.random() - 0.5) * 14, s: "drop", until: 0, read: 0, kind: "bill" });
}

function reject(w: World, c: Coin, x: number, y: number) {
  c.kind = "reject"; c.s = "drop"; c.x = x; c.y = y;
  c.vx = -(120 + Math.random() * 260); c.vy = -(220 + Math.random() * 260); c.vr = (Math.random() - 0.5) * 16;
}

function settle(w: World, c: Coin, floor: number): boolean {
  const i = Math.max(0, Math.min(w.heights.length - 1, Math.round(c.x / BIN)));
  const top = floor - w.heights[i];
  const half = c.kind === "bill" ? 8 : R;
  if (c.y + half < top || c.vy < 0) return false;
  c.y = top - half;
  if (Math.abs(c.vx) > 90 && w.heights[i] < 4) { c.vy *= -0.32; c.vx *= 0.55; return false; }
  c.s = "rest";
  const add = c.kind === "bill" ? 9 : 13;
  for (let k = -3; k <= 3; k++) {
    const j = i + k;
    if (j >= 0 && j < w.heights.length) w.heights[j] += add * (1 - Math.abs(k) / 4);
  }
  return true;
}

function step(w: World, dt: number, now: number) {
  const g = geom(w);
  if (w.firing && now - w.lastFire > 70) { spawn(w, w.px, w.py); w.lastFire = now; }

  if (w.mode === "lock" && !w.holder && w.queue.length) {
    const c = w.queue.shift()!;
    c.s = "inside"; c.until = now + 150; w.holder = c;
  }

  for (const c of w.coins) {
    if (c.s === "rest") continue;
    c.rot += c.vr * dt;
    if (c.s === "fly") {
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x >= g.gx - R - 2) {
        if (w.mode !== "lock") {
          if (w.balance >= AMT) { c.s = "inside"; c.read = w.balance; c.until = now + 520 + Math.random() * 380; }
          else reject(w, c, g.gx - R - 4, c.y);
        } else {
          c.s = "queue"; w.queue.push(c);
        }
      }
    } else if (c.s === "queue") {
      const i = w.queue.indexOf(c);
      const tx = g.gx - R - 4 - i * (R * 2 + 2);
      c.x += (tx - c.x) * Math.min(1, dt * 12);
      c.y += (g.gy - c.y) * Math.min(1, dt * 12);
    } else if (c.s === "inside") {
      if (now >= c.until) {
        const lock = w.mode === "lock";
        if (w.mode === "naive" || w.balance >= AMT) {
          w.balance -= AMT;
          if (w.balance < 0) w.flash = now;
          payout(w, g.vx - 4, g.vy + g.vh * 0.5);
          c.s = "rest"; c.kind = "coin"; c.x = -999;
        } else {
          w.flash = now;
          reject(w, c, g.gx - R - 4, c.s === "inside" && w.mode === "check" ? g.vy + g.vh * 0.5 : g.gy);
        }
        if (lock) w.holder = null;
      }
    } else if (c.s === "drop") {
      c.vy += G * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x < 12) { c.x = 12; c.vx = Math.abs(c.vx) * 0.4; }
      if (c.kind === "reject" && c.x > g.gx - R) { c.x = g.gx - R; c.vx = -Math.abs(c.vx) * 0.5; }
      settle(w, c, g.floor);
    }
  }
  w.coins = w.coins.filter((c) => c.x > -500);
  if (w.coins.length > 900) w.coins.splice(0, w.coins.length - 900);
}

function money(c: number) {
  const s = Math.abs(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (c < 0 ? "−$" : "$") + s;
}

function draw(ctx: CanvasRenderingContext2D, w: World, now: number, f: { d: string; m: string }) {
  const { W, H } = w;
  const g = geom(w);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

  // you got
  const stolen = Math.max(0, w.paid - START);
  ctx.fillStyle = C.cream;
  ctx.font = `bold 11px ${f.m}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("YOU WALKED OUT WITH", 24, 40);
  ctx.font = `900 ${Math.min(96, W * 0.09)}px ${f.d}`;
  ctx.fillStyle = C.lime;
  ctx.fillText(money(w.paid), 22, 40 + Math.min(92, W * 0.085));
  if (stolen > 0) {
    const y = 64 + Math.min(92, W * 0.085);
    const label = `${money(stolen)} NEVER EXISTED`;
    ctx.font = `bold 13px ${f.m}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = C.black; ctx.fillRect(27, y - 13, tw + 20, 26);
    ctx.fillStyle = C.pink; ctx.fillRect(24, y - 16, tw + 20, 26);
    ctx.strokeStyle = C.black; ctx.lineWidth = 2.5; ctx.strokeRect(24, y - 16, tw + 20, 26);
    ctx.fillStyle = C.black; ctx.fillText(label, 34, y + 2);
  }

  // first-visit hint, gone after the first coin
  if (w.paid === 0 && w.coins.length === 0 && !w.firing) {
    const small = W < 640;
    const y = g.floor - (small ? 150 : 190);
    ctx.fillStyle = C.cream; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = `900 ${small ? 30 : 48}px ${f.d}`;
    ctx.fillText(small ? "TAP HERE" : "CLICK HERE", 24, y);
    ctx.font = `bold ${small ? 10 : 11}px ${f.m}`;
    ctx.fillText(small ? "AND HOLD" : "AND HOLD · OR PRESS FIRE ×30", 26, y + 22);
    const tx = 50, ty = y + (small ? 70 : 80), q = (now % 1100) / 1100;
    ctx.strokeStyle = C.cream; ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.arc(tx, ty, 10 + q * 26, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.black; ctx.lineWidth = 2.5; ctx.stroke();
  }

  // floor
  ctx.fillStyle = C.black; ctx.fillRect(0, g.floor, W, H - g.floor);
  ctx.fillStyle = C.cream; ctx.font = `bold 10px ${f.m}`;
  ctx.fillText(W < 640 ? "TAP AND HOLD · EACH COIN = −$10" : "CLICK AND HOLD ANYWHERE · EACH COIN IS A −$10 PAYMENT", 14, g.floor + 15);

  // vault
  const shake = now - w.flash < 350 ? Math.sin(now / 18) * 4 : 0;
  const vx = g.vx + shake;
  ctx.fillStyle = C.black; ctx.fillRect(vx + 8, g.vy + 8, g.vw, g.vh);
  ctx.fillStyle = w.balance < 0 ? C.pink : C.cream; ctx.fillRect(vx, g.vy, g.vw, g.vh);
  ctx.lineWidth = 3; ctx.strokeStyle = C.black; ctx.strokeRect(vx, g.vy, g.vw, g.vh);
  ctx.fillStyle = C.black; ctx.fillRect(vx, g.vy - 26, 112, 26);
  ctx.fillStyle = C.yellow; ctx.font = `bold 11px ${f.m}`; ctx.fillText("POSTGRES ROW", vx + 10, g.vy - 9);
  ctx.fillStyle = C.black; ctx.font = `bold 11px ${f.m}`;
  ctx.fillText("BALANCE", vx + 16, g.vy + 30);
  ctx.font = `900 ${Math.min(64, g.vw * 0.27)}px ${f.d}`;
  ctx.fillText(money(w.balance), vx + 14, g.vy + 30 + Math.min(62, g.vw * 0.26));
  ctx.font = `bold ${g.vw < 220 ? 8 : 10}px ${f.m}`;
  ctx.fillText(w.mode === "lock" ? "SELECT … FOR UPDATE" : w.mode === "check" ? "CHECK (balance_cents >= 0)" : "READ → WAIT → WRITE", vx + 16, g.vy + g.vh - 16);
  if (w.mode === "check") {
    const on = now - w.flash < 400;
    ctx.fillStyle = on ? C.pink : C.lime; ctx.fillRect(vx + g.vw - 92, g.vy - 26, 92, 26);
    ctx.strokeStyle = C.black; ctx.lineWidth = 3; ctx.strokeRect(vx + g.vw - 92, g.vy - 26, 92, 26);
    ctx.fillStyle = C.black; ctx.font = `bold 11px ${f.m}`; ctx.fillText("CHECK ≥ 0", vx + g.vw - 80, g.vy - 9);
  }

  // gate
  ctx.fillStyle = C.black; ctx.fillRect(g.gx - 3, g.vy, 7, g.vh);
  if (w.mode === "lock") {
    const lx = g.gx - 1, ly = g.vy - 2;
    ctx.fillStyle = C.lime; ctx.strokeStyle = C.black; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(lx, ly - 12, 9, Math.PI, 0); ctx.stroke();
    ctx.fillRect(lx - 14, ly - 12, 28, 22); ctx.strokeRect(lx - 14, ly - 12, 28, 22);
  }

  // processing slots inside vault
  const inside = w.coins.filter((c) => c.s === "inside");
  inside.forEach((c, i) => {
    const cols = Math.max(1, Math.floor((g.vw - 32) / 26));
    const x = vx + 28 + (i % cols) * 26;
    const y = g.vy + g.vh * 0.5 + Math.floor(i / cols) * 26;
    coin(ctx, x, y, now / 120 + i, C.yellow, "$", f.m);
  });
  if (w.mode !== "lock" && inside.length > 1 && g.vw >= 220) {
    ctx.fillStyle = C.black; ctx.font = `bold 11px ${f.m}`; ctx.textAlign = "left";
    ctx.fillText(`${inside.length} PAYMENTS ALL READ ${money(inside[0].read)}`, vx + 16, g.vy + g.vh * 0.5 - 22);
  }
  ctx.textAlign = "left";

  for (const c of w.coins) {
    if (c.s === "inside" || c.x < -100) continue;
    if (c.kind === "bill") bill(ctx, c.x, c.y, c.rot);
    else if (c.kind === "reject") coin(ctx, c.x, c.y, c.rot, C.pink, "✕", f.m);
    else coin(ctx, c.x, c.y, c.rot, C.yellow, "$", f.m);
  }
}

function coin(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, fill: string, label: string, mono: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = C.black; ctx.beginPath(); ctx.arc(2, 2, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.black; ctx.stroke();
  ctx.fillStyle = C.black; ctx.font = `bold 12px ${mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function bill(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * 0.3);
  ctx.fillStyle = C.black; ctx.fillRect(-12, -6, 26, 16);
  ctx.fillStyle = C.lime; ctx.fillRect(-14, -8, 26, 16);
  ctx.lineWidth = 2; ctx.strokeStyle = C.black; ctx.strokeRect(-14, -8, 26, 16);
  ctx.beginPath(); ctx.arc(-1, 0, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export default function RaceToy() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const [mode, setMode] = useState<Mode>("naive");
  const [stats, setStats] = useState({ paid: 0, balance: START });

  useEffect(() => {
    const el = canvas.current!, box = wrap.current!;
    const ctx = el.getContext("2d")!;
    const fonts = { d: getComputedStyle(box).fontFamily, m: getComputedStyle(el).fontFamily };
    let raf = 0, last = performance.now(), lastStat = 0;

    const resize = () => {
      const W = box.clientWidth, H = W < 640 ? 460 : 560;
      const dpr = window.devicePixelRatio || 1;
      el.width = W * dpr; el.height = H * dpr; el.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const prev = world.current;
      world.current = fresh(W, H, prev?.mode ?? "naive");
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(box);

    const loop = (now: number) => {
      const w = world.current!;
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      step(w, dt, now);
      draw(ctx, w, now, fonts);
      if (now - lastStat > 120) { lastStat = now; setStats({ paid: w.paid, balance: w.balance }); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const pick = (m: Mode) => {
    const w = world.current!;
    world.current = fresh(w.W, w.H, m);
    setMode(m);
  };

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const w = world.current!;
    w.px = e.clientX - r.left; w.py = e.clientY - r.top;
  };

  const stolen = Math.max(0, stats.paid - START);

  return (
    <div ref={wrap} className="font-display relative border-[3px] border-brutal-black shadow-[10px_10px_0_0_#000] bg-[#3B5BFF] select-none">
      <canvas
        ref={canvas}
        className="font-mono block w-full cursor-crosshair touch-pan-y"
        role="img"
        aria-label={`Coins fly at a $100 balance. Paid out ${money(stats.paid)}, balance ${money(stats.balance)}.`}
        onPointerDown={(e) => { point(e); const w = world.current!; w.firing = true; spawn(w, w.px, w.py); w.lastFire = performance.now(); }}
        onPointerMove={point}
        onPointerUp={() => { world.current!.firing = false; }}
        onPointerLeave={() => { world.current!.firing = false; }}
        onPointerCancel={() => { world.current!.firing = false; }}
      />

      <div className="border-t-[3px] border-brutal-black bg-cream flex flex-col sm:flex-row">
        <div className="grid grid-cols-3 flex-1">
          {MODES.map((m, i) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => pick(m.id)}
                aria-pressed={on}
                className={`text-left px-3 sm:px-5 py-4 border-brutal-black transition-colors ${i < 2 ? "border-r-[3px]" : "sm:border-r-[3px]"} ${on ? "" : "bg-cream hover:bg-white"}`}
                style={on ? { background: m.bg } : undefined}
              >
                <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">{m.n}</span>
                <span className="block font-display font-black uppercase tracking-[-0.03em] text-lg sm:text-2xl leading-none mt-1">{m.name}</span>
                <span className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.1em] text-brutal-black/60 mt-1.5">{m.sub}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 sm:flex border-t-[3px] sm:border-t-0 border-brutal-black">
          <button
            onClick={() => burst(world.current!, 30)}
            className="px-6 py-4 border-r-[3px] border-brutal-black bg-brutal-yellow hover:bg-brutal-black hover:text-brutal-yellow font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors"
          >
            Fire ×30
          </button>
          <div className="px-5 py-3 flex flex-col justify-center min-w-[150px]" aria-live="polite">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">Never existed</span>
            <span className={`font-display font-black text-2xl leading-none tracking-[-0.03em] ${stolen > 0 ? "text-[#E0007A]" : "text-brutal-black/40"}`}>{money(stolen)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A tiny game loop for the lab toys: one mutable world per canvas, stepped and
// drawn every frame outside React. React only sees a small snapshot ~10×/s.
// Games are laid out in a world that is always 280 units tall; the canvas
// scales that up to whatever height the stage has.

export const C = {
  black: "#000000",
  cream: "#FFFDF5",
  white: "#FFFFFF",
  yellow: "#FFE600",
  pink: "#FF5CAA",
  lime: "#C6FF3D",
  blue: "#3B5BFF",
  lilac: "#B79CFF",
  orange: "#FF8A3D",
  teal: "#4ECDC4",
  red: "#E0007A",
};

export interface Size { W: number; H: number }
export const WORLD_H = 280;
export interface Fonts { d: string; m: string }
type X = CanvasRenderingContext2D;

export const now = () => performance.now();
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const ease = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Cfg<W, S> {
  init: () => W;
  step: (w: W, dt: number, t: number, s: Size) => void;
  draw: (ctx: X, w: W, t: number, s: Size, f: Fonts) => void;
  snap: (w: W) => S;
}

export function useArena<W, S>(cfg: Cfg<W, S>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<W | null>(null);
  const size = useRef<Size>({ W: 300, H: WORLD_H });
  const scale = useRef(1);
  const cfgRef = useRef(cfg);
  const [snap, setSnap] = useState<S>(() => cfg.snap(cfg.init()));

  useEffect(() => { cfgRef.current = cfg; });

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    if (!world.current) world.current = cfgRef.current.init();
    const fonts = { d: getComputedStyle(el.parentElement!).fontFamily, m: getComputedStyle(el).fontFamily };
    const resize = () => {
      const W = el.clientWidth, H = el.clientHeight, dpr = window.devicePixelRatio || 1;
      const k = H / WORLD_H;
      el.width = W * dpr; el.height = H * dpr;
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      size.current = { W: W / k, H: WORLD_H };
      scale.current = k;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    let raf = 0, last = now(), lastSnap = 0, prev = "";
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      if (!visible) return;
      const w = world.current!, c = cfgRef.current;
      c.step(w, dt, t, size.current);
      c.draw(ctx, w, t, size.current, fonts);
      if (t - lastSnap > 90) {
        lastSnap = t;
        const s = c.snap(w), k = JSON.stringify(s);
        if (k !== prev) { prev = k; setSnap(s); }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  const act = useCallback((fn: (w: W, t: number, s: Size) => void) => {
    const w = world.current;
    if (w) fn(w, now(), size.current);
  }, []);

  const local = useCallback((e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale.current, y: (e.clientY - r.top) / scale.current };
  }, []);

  return { canvas, snap, act, local };
}

// ── Drawing ──────────────────────────────────────────────────────────────────

export function bg(ctx: X, s: Size, fill: string, line = "rgba(255,255,255,0.13)") {
  ctx.fillStyle = fill; ctx.fillRect(0, 0, s.W, s.H);
  ctx.strokeStyle = line; ctx.lineWidth = 1;
  for (let x = 0; x < s.W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.H); ctx.stroke(); }
  for (let y = 0; y < s.H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(s.W, y + 0.5); ctx.stroke(); }
}

export function box(ctx: X, x: number, y: number, w: number, h: number, fill: string, sh = 5, lw = 3) {
  if (sh) { ctx.fillStyle = C.black; ctx.fillRect(x + sh, y + sh, w, h); }
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = lw; ctx.strokeStyle = C.black; ctx.strokeRect(x, y, w, h);
}

export function text(ctx: X, s: string, x: number, y: number, font: string, color = C.black, align: CanvasTextAlign = "left", base: CanvasTextBaseline = "alphabetic") {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.fillText(s, x, y);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

export function tag(ctx: X, s: string, x: number, y: number, f: Fonts, fill = C.black, ink = C.yellow, size = 10): number {
  ctx.font = `bold ${size}px ${f.m}`;
  const w = ctx.measureText(s).width + 12, h = size + 10;
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  if (fill !== C.black) { ctx.lineWidth = 2.5; ctx.strokeStyle = C.black; ctx.strokeRect(x, y, w, h); }
  text(ctx, s, x + 6, y + h / 2 + 1, ctx.font, ink, "left", "middle");
  return w;
}

export function coin(ctx: X, x: number, y: number, r: number, rot: number, fill: string, label: string, f: Fonts, fs = 11) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = C.black; ctx.beginPath(); ctx.arc(2, 2, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.black; ctx.stroke();
  if (label) text(ctx, label, 0, 1, `bold ${fs}px ${f.m}`, C.black, "center", "middle");
  ctx.restore();
}

export function bill(ctx: X, x: number, y: number, rot: number, fill = C.lime, w = 26, h = 16) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = C.black; ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w, h);
  ctx.fillStyle = fill; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = 2; ctx.strokeStyle = C.black; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.beginPath(); ctx.arc(0, 0, h / 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function star(ctx: X, x: number, y: number, r: number, fill: string, pts = 9) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.55 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.black; ctx.stroke();
}

/** Largest font size (≤ max) at which `s` fits in `maxW`. */
export function fit(ctx: X, s: string, maxW: number, max: number, family: string, weight = "900"): number {
  ctx.font = `${weight} ${max}px ${family}`;
  const w = ctx.measureText(s).width;
  return w > maxW ? Math.max(9, Math.floor((max * maxW) / w)) : max;
}

// ── Physics: things fall and pile up ─────────────────────────────────────────

export interface P {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  rest: boolean; kind: string; t0: number; label?: string;
}

export const BIN = 6;
export const newPile = () => new Float32Array(600);

export function particle(x: number, y: number, vx: number, vy: number, kind: string, t0: number, label?: string): P {
  return { x, y, vx, vy, rot: rnd(-0.4, 0.4), vr: rnd(-8, 8), rest: false, kind, t0, label };
}

export function fall(p: P, dt: number, pile: Float32Array, floor: number, half: number, add: number, xmin = 0, xmax = 1e5, g = 1700) {
  if (p.rest) return;
  p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  if (p.x < xmin + half) { p.x = xmin + half; p.vx = Math.abs(p.vx) * 0.4; }
  if (p.x > xmax - half) { p.x = xmax - half; p.vx = -Math.abs(p.vx) * 0.4; }
  const i = clamp(Math.round(p.x / BIN), 0, pile.length - 1);
  const top = floor - pile[i];
  if (p.vy > 0 && p.y + half >= top) {
    p.y = top - half;
    if (p.vy > 520) { p.vy *= -0.3; p.vx *= 0.6; return; }
    p.rest = true; p.vr = 0;
    for (let k = -3; k <= 3; k++) {
      const j = i + k;
      if (j >= 0 && j < pile.length) pile[j] += add * (1 - Math.abs(k) / 4);
    }
  }
}

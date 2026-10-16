import type { Diagram, DiagramNode } from "@/lib/work-data";

// Grid geometry. Nodes sit centered in cells; edges route orthogonally.
const CELL_W = 250;
const CELL_H = 132;
const NODE_W = 212;
const NODE_H = 68;
const PAD = 28;
const SHADOW = 6;

const CREAM = "#FFFDF5";
const YELLOW = "#FFE600";
const INK = "#0a0a0a";

type Box = { x: number; y: number; cx: number; cy: number; w: number; h: number; node: DiagramNode };

function layout(nodes: DiagramNode[]): Record<string, Box> {
  const boxes: Record<string, Box> = {};
  for (const n of nodes) {
    const span = n.w ?? 1;
    const w = NODE_W + (span - 1) * CELL_W;
    const x = PAD + n.col * CELL_W + (CELL_W - NODE_W) / 2;
    const y = PAD + n.row * CELL_H + (CELL_H - NODE_H) / 2;
    boxes[n.id] = { x, y, w, h: NODE_H, cx: x + w / 2, cy: y + NODE_H / 2, node: n };
  }
  return boxes;
}

/** Y at the middle of the gap just above a given row (between row-1 and row). */
const gapAbove = (row: number) => PAD + row * CELL_H;
/** Y at the middle of the gap just below a given row. */
const gapBelow = (row: number) => PAD + (row + 1) * CELL_H;

/**
 * Orthogonal path between two boxes. Returns points and a label anchor.
 * Same-row edges are short, so their label sits above the node band.
 */
function route(a: Box, b: Box): { d: string; mid: [number, number] } {
  const pts: [number, number][] = [];
  const ar = a.node.row;
  const br = b.node.row;
  const ac = a.node.col;
  const bc = b.node.col;

  if (ar === br) {
    const fromRight = bc > ac;
    const y = a.cy;
    const x1 = fromRight ? a.x + a.w : a.x;
    const x2 = fromRight ? b.x : b.x + b.w;
    pts.push([x1, y], [x2, y]);
    const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
    return { d, mid: [(x1 + x2) / 2, a.y - 14] };
  } else if (ac === bc && (a.node.w ?? 1) === (b.node.w ?? 1)) {
    const down = br > ar;
    pts.push([a.cx, down ? a.y + a.h : a.y], [b.cx, down ? b.y : b.y + b.h]);
  } else {
    const down = br > ar;
    // Enter the target off-center so converging edges do not overlap.
    const offset = Math.sign(ac - bc) * (b.w * 0.28);
    const gapY = down ? gapAbove(br) : gapBelow(br);
    const startY = down ? a.y + a.h : a.y;
    const endY = down ? b.y : b.y + b.h;
    pts.push([a.cx, startY], [a.cx, gapY], [b.cx + offset, gapY], [b.cx + offset, endY]);
  }

  // Longest segment midpoint for the label.
  let best: [number, number] = pts[0];
  let bestLen = -1;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len > bestLen) {
      bestLen = len;
      best = [(x1 + x2) / 2, (y1 + y2) / 2];
    }
  }

  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  return { d, mid: best };
}

/**
 * Architecture diagram as inline SVG, generated from typed data.
 * Drawn in the site's style: hard strokes, offset shadows, mono labels.
 */
export default function ArchDiagram({ diagram, id }: { diagram: Diagram; id: string }) {
  const boxes = layout(diagram.nodes);
  const width = PAD * 2 + diagram.cols * CELL_W;
  const height = PAD * 2 + diagram.rows * CELL_H;
  const markerId = `arrow-${id}`;

  return (
    <figure className="border-[3px] border-cream bg-[#0a0a0a]" style={{ boxShadow: "6px 6px 0px 0px #FFE600" }}>
      <figcaption className="flex items-center justify-between gap-4 px-4 py-2.5 border-b-[3px] border-cream/15 bg-[#111111]">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cream/50">
          Architecture
        </span>
        <span className="font-mono text-[11px] text-cream/55 truncate hidden md:inline">{diagram.title}</span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-yellow md:hidden" aria-hidden="true">
          Scroll →
        </span>
      </figcaption>

      <div className="overflow-x-auto scrollbar-hide">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-labelledby={`${id}-title`}
          className="block min-w-[680px] md:min-w-0"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <title id={`${id}-title`}>{diagram.title}</title>
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 Z" fill={CREAM} />
            </marker>
            <pattern id={`grid-${id}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke={CREAM} strokeOpacity="0.06" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width={width} height={height} fill={`url(#grid-${id})`} />

          {/* Edges under nodes */}
          {diagram.edges.map((e, i) => {
            const a = boxes[e.from];
            const b = boxes[e.to];
            if (!a || !b) return null;
            const { d, mid } = route(a, b);
            const labelW = e.label ? e.label.length * 6.8 + 14 : 0;
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={CREAM}
                  strokeOpacity={e.dashed ? 0.55 : 0.9}
                  strokeWidth="2"
                  strokeDasharray={e.dashed ? "6 6" : undefined}
                  markerEnd={`url(#${markerId})`}
                />
                {e.label && (
                  <g transform={`translate(${mid[0] - labelW / 2} ${mid[1] - 10})`}>
                    <rect width={labelW} height="20" fill={INK} stroke={CREAM} strokeOpacity="0.25" strokeWidth="1" />
                    <text x={labelW / 2} y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill={CREAM} fillOpacity="0.75" letterSpacing="0.05em">
                      {e.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {diagram.nodes.map((n) => {
            const b = boxes[n.id];
            return (
              <g key={n.id}>
                <rect x={b.x + SHADOW} y={b.y + SHADOW} width={b.w} height={b.h} fill={n.accent ? YELLOW : CREAM} fillOpacity={n.accent ? 1 : 0.22} />
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={INK} stroke={n.accent ? YELLOW : CREAM} strokeWidth="3" />
                <text x={b.x + 14} y={b.y + (n.sub ? 29 : 40)} fontSize="14" fontWeight="700" fill={n.accent ? YELLOW : CREAM} letterSpacing="-0.02em">
                  {n.label}
                </text>
                {n.sub && (
                  <text x={b.x + 14} y={b.y + 49} fontSize="11" fill={CREAM} fillOpacity="0.6">
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

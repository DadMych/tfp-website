import type { Snippet } from "@/lib/work-data";
import { T } from "./Explain";
import CodeSnippet from "@/components/work/CodeSnippet";

/* Shared, presentational building blocks for Money Lab modules. No state. */

export function Section({
  n,
  title,
  lede,
  plainTitle,
  plainLede,
  tone = "white",
  children,
}: {
  n: string;
  title: string;
  lede?: React.ReactNode;
  /** Plain English versions. Fall back to the technical ones. */
  plainTitle?: string;
  plainLede?: React.ReactNode;
  /** "tile" paints the card in the module colour (set by MoneyShell). */
  tone?: "white" | "tile";
  children: React.ReactNode;
}) {
  const tile = tone === "tile";
  const h = plainTitle ? <T tech={title} plain={plainTitle} /> : title;
  const l = plainLede ? <T tech={lede} plain={plainLede} /> : lede;
  return (
    <section
      className="flex flex-col gap-6 md:gap-8 border-[3px] border-brutal-black bg-white p-5 md:p-8 shadow-[10px_10px_0_0_#000]"
      style={tile ? { background: "var(--tile)", color: "var(--ink)" } : undefined}
    >
      <header className="flex flex-col gap-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
          <span className="inline-block px-1.5 py-0.5 mr-2" style={tile ? { background: "var(--badge)", color: "var(--badge-ink)" } : { background: "#000", color: "#FFFDF5" }}>
            {n}
          </span>
          Step {n.replace(/^0/, "")}
        </span>
        <h2 className="font-display font-black uppercase tracking-[-0.05em] text-4xl md:text-6xl leading-[0.85]">{h}</h2>
        {lede && <p className={`font-display text-base md:text-lg leading-snug max-w-3xl ${tile ? "opacity-85" : "text-brutal-black/80"}`}>{l}</p>}
      </header>
      {children}
    </section>
  );
}

export type Tone = "neutral" | "good" | "bad" | "warn";

const toneBox: Record<Tone, string> = {
  neutral: "bg-white",
  good: "bg-[#C6FF3D]",
  bad: "bg-[#FF5CAA]",
  warn: "bg-brutal-yellow",
};

export function StatBox({ value, label, tone = "neutral", sub }: { value: string; label: React.ReactNode; tone?: Tone; sub?: React.ReactNode }) {
  return (
    <div className={`border-[3px] border-brutal-black text-brutal-black shadow-[4px_4px_0_0_#000] p-4 md:p-5 flex flex-col gap-2 ${toneBox[tone]}`}>
      <span className="font-display font-black leading-none tracking-[-0.04em] [overflow-wrap:anywhere] tabular-nums" style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.25rem)" }}>
        {value}
      </span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{label}</span>
      {sub && <span className="font-mono text-[11px] leading-snug opacity-70">{sub}</span>}
    </div>
  );
}

/** White box with a hard shadow: the picture area of a console, like a game stage. */
export function Stage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-[3px] border-brutal-black bg-white text-brutal-black shadow-[8px_8px_0_0_#000] p-5 md:p-6 ${className}`}>{children}</div>;
}

/** Three short points under a heading. Plain versions swap in with the switch. */
export type Point = { title: string; body: React.ReactNode; plainTitle?: string; plainBody?: React.ReactNode };
export function Points({ items }: { items: Point[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
      {items.map((it) => (
        <div key={it.title} className="flex flex-col gap-3 border-t-[3px] border-brutal-black pt-4">
          <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em]">{it.plainTitle ? <T tech={it.title} plain={it.plainTitle} /> : it.title}</h3>
          <p className="font-display text-base leading-relaxed text-brutal-black/80">{it.plainBody ? <T tech={it.body} plain={it.plainBody} /> : it.body}</p>
        </div>
      ))}
    </div>
  );
}

/** Column header for a side-by-side "breaks | holds" layout. */
export function ImplHeader({ kind, title, note, plainTitle, plainNote }: { kind: "bad" | "good"; title: string; note: string; plainTitle?: string; plainNote?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 border-[2px] border-brutal-black ${kind === "bad" ? "bg-[#FF5CAA]" : "bg-[#C6FF3D]"}`}>
          {kind === "bad" ? "Breaks" : "Holds"}
        </span>
        <span className="font-display font-black uppercase tracking-[-0.02em] text-lg leading-none">{plainTitle ? <T tech={title} plain={plainTitle} /> : title}</span>
      </div>
      <span className="font-mono text-[11px] leading-snug opacity-60 min-h-[3lh]">{plainNote ? <T tech={note} plain={plainNote} /> : note}</span>
    </div>
  );
}

export type CellStatus = "idle" | "pending" | "ok" | "bad" | "rejected" | "warn" | "off";

const cellColor: Record<CellStatus, string> = {
  off: "bg-[repeating-linear-gradient(45deg,#3a3a3a_0_2px,#1a1a1a_2px_7px)]",
  idle: "bg-white",
  pending: "bg-dirty-cream",
  ok: "bg-brutal-green",
  bad: "bg-brutal-red",
  rejected: "bg-[#6b6b6b]",
  warn: "bg-brutal-yellow",
};

/** Grid of equal squares, one per request. Status drives colour only. */
export function CellGrid({ cells, cols = 10, label }: { cells: CellStatus[]; cols?: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="grid gap-[3px] border-[3px] border-brutal-black bg-brutal-black p-[3px] shadow-[4px_4px_0_0_#000]"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {cells.map((s, i) => (
        <span key={i} className={`block aspect-square ${cellColor[s]} transition-colors duration-150`} />
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { status: CellStatus; label: React.ReactNode }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((it) => (
        <li key={it.status} className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-brutal-black/70">
          <span className={`inline-block w-3 h-3 border-[2px] border-brutal-black ${cellColor[it.status]}`} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export type Column<T> = { key: keyof T & string; label: string; align?: "left" | "right"; render?: (row: T) => React.ReactNode };

/** Raw rows straight from Postgres. Dark, mono, scrolls horizontally on phones. */
export function RawRows<T extends Record<string, unknown>>({
  title,
  columns,
  rows,
  empty = "No rows yet.",
  maxHeight = 260,
}: {
  title: string;
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  maxHeight?: number;
}) {
  return (
    <figure className="border-[3px] border-brutal-black bg-[#0a0a0a] text-cream">
      <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 border-b-[3px] border-cream/15 bg-[#111111]">
        <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase text-cream/60">{title}</span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream/50">{rows.length} rows</span>
      </figcaption>
      <div className="overflow-auto" style={{ height: maxHeight }}>
        <table className="w-full border-collapse font-mono text-[12px] leading-tight">
          <thead className="sticky top-0 bg-[#0a0a0a]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cream/55 border-b border-cream/15 whitespace-nowrap ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-5 text-cream/50">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-cream/10 last:border-b-0">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-1.5 whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}>
                      {c.render ? c.render(r) : String(r[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export function RunButton({
  children,
  onClick,
  busy,
  disabled,
  tone = "yellow",
  size = "lg",
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "yellow" | "black" | "white";
  size?: "lg" | "md";
}) {
  const toneCls =
    tone === "yellow"
      ? "bg-brutal-yellow text-brutal-black"
      : tone === "black"
        ? "bg-brutal-black text-cream"
        : "bg-white text-brutal-black";
  const sizeCls = size === "lg" ? "px-8 py-5 min-w-[18rem] text-2xl md:text-3xl shadow-[5px_5px_0_0_#000]" : "px-5 h-12 text-base shadow-[4px_4px_0_0_#000]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`relative inline-flex items-center justify-center gap-3 whitespace-nowrap border-[3px] border-brutal-black font-display font-black uppercase tracking-[-0.02em] leading-none hover:bg-brutal-black hover:text-brutal-yellow active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow,background-color,color] duration-100 disabled:opacity-60 disabled:cursor-not-allowed ${toneCls} ${sizeCls}`}
    >
      {busy && <span className="pulse-dot absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "bad" | "warn" }) {
  const cls = tone === "bad" ? "bg-[#FF5CAA] text-brutal-black" : tone === "warn" ? "bg-brutal-yellow text-brutal-black" : "bg-brutal-black text-cream";
  return (
    <p className={`h-[9.5rem] md:h-[6.5rem] overflow-hidden flex items-center border-[3px] border-brutal-black shadow-[5px_5px_0_0_#000] px-5 py-3 font-display font-bold text-sm md:text-base leading-snug ${cls}`} aria-live="polite">
      {children}
    </p>
  );
}

export function CodeCompare({ bad, good }: { bad: Snippet; good: Snippet }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
      <div className="flex flex-col gap-3">
        <ImplHeader kind="bad" title="Breaks" note="The version that loses money." plainNote="The version that loses money. Read the grey notes under it, not the code." />
        <CodeSnippet snippet={bad} />
      </div>
      <div className="flex flex-col gap-3">
        <ImplHeader kind="good" title="Holds" note="The version in this lab's database." plainNote="The version running behind the buttons above." />
        <CodeSnippet snippet={good} />
      </div>
    </div>
  );
}

/** Native accordion for the deep-dive list under a console. */
export function Deep({ q, children }: { q: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group border-t-[3px] border-brutal-black last:border-b-[3px] open:bg-white">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-4 px-1 font-display font-bold text-lg md:text-xl leading-snug hover:bg-brutal-yellow transition-colors [&::-webkit-details-marker]:hidden">
        <span>{q}</span>
        <span aria-hidden="true" className="font-mono text-2xl leading-none transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="px-1 pb-6 flex flex-col gap-4 font-display text-base leading-relaxed text-brutal-black/80 max-w-3xl">{children}</div>
    </details>
  );
}

export function Limits({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] leading-relaxed opacity-60 max-w-2xl">{children}</p>;
}

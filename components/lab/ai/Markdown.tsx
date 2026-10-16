"use client";

import { Fragment, useMemo } from "react";

/* The small Markdown subset the Northwind documents use, with one passage highlighted. */

type Block = { type: "h1" | "h2" | "h3" | "p" | "ul" | "ol" | "table" | "hr" | "quote"; lines: string[]; from: number; to: number };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function parse(body: string): Block[] {
  const blocks: Omit<Block, "from" | "to">[] = [];
  const kindOf = (l: string): Block["type"] | null =>
    /^# /.test(l) ? "h1" : /^## /.test(l) ? "h2" : /^#{3,} /.test(l) ? "h3" : /^-{3,}$/.test(l.trim()) ? "hr" : /^\|/.test(l) ? "table" : /^[-*] /.test(l) ? "ul" : /^\d+\. /.test(l) ? "ol" : /^> ?/.test(l) ? "quote" : null;
  let open = false;
  for (const line of body.split("\n")) {
    if (!line.trim()) {
      open = false;
      continue;
    }
    const k = kindOf(line) ?? "p";
    const last = blocks[blocks.length - 1];
    if (open && last.type === k && ["p", "ul", "ol", "table", "quote"].includes(k)) last.lines.push(line);
    else blocks.push({ type: k, lines: [line] });
    open = true;
  }
  // Offsets in the whitespace-collapsed body, which is what fixed chunks are cut from.
  const flat = norm(body);
  let cursor = 0;
  return blocks.map((b) => {
    const t = norm(b.lines.join("\n"));
    const at = flat.indexOf(t, cursor);
    const from = at >= 0 ? at : cursor;
    cursor = from + t.length;
    return { ...b, from, to: cursor };
  });
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold">
        {p.slice(2, -2)}
      </strong>
    ) : p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="font-mono text-[0.9em] bg-brutal-black/5 px-1">
        {p.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{p.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}</Fragment>
    )
  );
}

const cells = (row: string) => row.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());

function render(b: Block) {
  switch (b.type) {
    case "h1":
      return <h1 className="font-display font-black text-2xl md:text-3xl tracking-[-0.03em] leading-tight">{inline(b.lines[0].slice(2))}</h1>;
    case "h2":
      return <h2 className="font-display font-black text-lg md:text-xl tracking-[-0.02em] leading-tight pt-2">{inline(b.lines[0].slice(3))}</h2>;
    case "h3":
      return <h3 className="font-display font-bold text-base leading-tight">{inline(b.lines[0].replace(/^#+ /, ""))}</h3>;
    case "hr":
      return <hr className="border-t-2 border-dashed border-brutal-black/20" />;
    case "ul":
    case "ol": {
      const L = b.type === "ul" ? "ul" : "ol";
      return (
        <L className={`${b.type === "ul" ? "list-disc" : "list-decimal"} pl-5 flex flex-col gap-1`}>
          {b.lines.map((l, i) => (
            <li key={i}>{inline(l.replace(/^([-*]|\d+\.) /, ""))}</li>
          ))}
        </L>
      );
    }
    case "quote":
      return <blockquote className="border-l-[3px] border-brutal-black pl-3 italic opacity-80">{b.lines.map((l, i) => <p key={i}>{inline(l.replace(/^> ?/, ""))}</p>)}</blockquote>;
    case "table": {
      const rows = b.lines.filter((l) => !/^[\s|:-]+$/.test(l));
      const [head, ...body] = rows.map(cells);
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[12px]">
            <thead>
              <tr>{head.map((c, i) => <th key={i} className="text-left font-bold border-b-[3px] border-brutal-black px-2 py-1.5 whitespace-nowrap">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr key={i} className="border-b border-brutal-black/15">
                  {r.map((c, j) => <td key={j} className="px-2 py-1.5 align-top">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return (
        <p>
          {b.lines.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {inline(l)}
            </Fragment>
          ))}
        </p>
      );
  }
}

/**
 * `highlight` is a chunk's text. Every block that overlaps it gets marked, and the
 * section heading right before a marked block too.
 */
export default function Markdown({ body, highlight, markRef }: { body: string; highlight?: string; markRef?: React.Ref<HTMLDivElement> }) {
  const blocks = useMemo(() => parse(body), [body]);
  const range = useMemo(() => {
    if (!highlight) return null;
    const flat = norm(body);
    const t = norm(highlight);
    const at = flat.indexOf(t);
    return at >= 0 ? [at, at + t.length] : null;
  }, [body, highlight]);
  const on = blocks.map((b) => Boolean(range && b.from < range[1] && b.to > range[0]));
  const lit = on.map((v, i) => v || (blocks[i].type === "h2" && on[i + 1]));
  const first = lit.indexOf(true);

  return (
    <div className="flex flex-col font-display text-[15px] leading-relaxed text-brutal-black/90">
      {blocks.map((b, i) => (
        <div
          key={i}
          ref={i === first ? markRef : undefined}
          className={`px-3 -mx-3 py-1.5 transition-colors duration-300 ${lit[i] ? "bg-brutal-yellow/70 shadow-[inset_4px_0_0_0_#000]" : ""}`}
        >
          {render(b)}
        </div>
      ))}
    </div>
  );
}

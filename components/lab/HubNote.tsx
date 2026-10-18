import Link from "next/link";

export interface HubNoteDef {
  kicker: string;
  title: string;
  items: string[];
  /** Points down at what's under the chapters (and links to it), or left at the chapters themselves. */
  arrow: "down" | "left";
  href?: string;
}

const ARROWS = {
  down: { box: "0 0 140 240", line: "M30 10 C 100 0, 130 60, 80 85 C 40 105, 30 60, 70 60 C 120 60, 110 150, 75 225", head: "M90 214 L75 225 L73 207", cls: "w-28 h-48 ml-16" },
  left: { box: "0 0 200 120", line: "M190 20 C 150 0, 110 30, 130 55 C 150 80, 100 95, 70 70 C 50 55, 40 70, 12 80", head: "M30 83 L12 80 L24 66", cls: "w-44 h-28 -ml-10" },
};

/** Sticker beside a hub's chapter grid, with a hand-drawn dashed arrow. */
export default function HubNote({ note }: { note: HubNoteDef }) {
  const a = ARROWS[note.arrow];
  const box = (
    <>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em]">{note.kicker}</span>
      <span className="font-display font-black uppercase tracking-[-0.04em] text-2xl md:text-3xl leading-[0.9]">{note.title}</span>
      <ul className="flex flex-col gap-1 font-display text-base leading-snug">
        {note.items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden="true" className="font-mono font-bold">↳</span>
            {it}
          </li>
        ))}
      </ul>
      {note.href && (
        <span className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-2">
          Jump down <span aria-hidden="true" className="inline-block transition-transform duration-150 group-hover:translate-y-1">↓</span>
        </span>
      )}
    </>
  );
  const cls = "flex flex-col gap-3 border-[3px] border-brutal-black bg-brutal-yellow p-5 shadow-[8px_8px_0_0_#000] lg:-rotate-2";

  return (
    <aside className={`order-first lg:order-none self-start lg:sticky lg:top-36 flex flex-col ${note.arrow === "left" ? "hidden lg:flex" : ""}`}>
      {note.href ? (
        <Link href={note.href} className={`group ${cls} hover:rotate-0 hover:shadow-[4px_4px_0_0_#000] hover:translate-x-[4px] hover:translate-y-[4px] transition-[transform,box-shadow] duration-150`}>
          {box}
        </Link>
      ) : (
        <div className={cls}>{box}</div>
      )}
      <svg viewBox={a.box} fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`hidden lg:block mt-3 ${a.cls}`}>
        <path d={a.line} strokeDasharray="10 4" className="dash-march" />
        <path d={a.head} />
      </svg>
    </aside>
  );
}

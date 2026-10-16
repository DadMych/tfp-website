import Link from "next/link";
import { WORK_TAGS, workCases, type WorkTag } from "@/lib/work-data";

/**
 * Filter chips. State lives in the URL (?tag=), so this is plain links:
 * no client JS, back button works, every filter is a shareable address.
 */
export default function TagFilter({ active }: { active?: WorkTag }) {
  const counts = Object.fromEntries(
    WORK_TAGS.map((t) => [t, workCases.filter((c) => c.tags.includes(t)).length])
  ) as Record<WorkTag, number>;

  const chip =
    "inline-flex items-center gap-2 border-[3px] border-brutal-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.15em] transition-[transform,box-shadow,background-color] duration-150 whitespace-nowrap";
  const idle = "bg-cream text-brutal-black shadow-brutal-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal";
  const on = "bg-brutal-black text-cream shadow-brutal-yellow -translate-x-[2px] -translate-y-[2px]";

  return (
    <nav aria-label="Filter cases by tag" className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
      <ul className="flex items-center gap-3 py-2 pr-4 w-max sm:w-auto sm:flex-wrap">
        <li>
          <Link
            href="/work"
            className={`${chip} ${active ? idle : on}`}
            aria-current={active ? undefined : "page"}
          >
            All
            <span className={`text-[10px] ${active ? "text-brutal-black/60" : "text-brutal-yellow"}`}>
              {workCases.length}
            </span>
          </Link>
        </li>
        {WORK_TAGS.map((t) => {
          const isOn = active === t;
          return (
            <li key={t}>
              <Link
                href={`/work?tag=${t.toLowerCase()}`}
                className={`${chip} ${isOn ? on : idle}`}
                aria-current={isOn ? "page" : undefined}
              >
                {t}
                <span className={`text-[10px] ${isOn ? "text-brutal-yellow" : "text-brutal-black/60"}`}>
                  {counts[t]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CaseRow from "@/components/work/CaseRow";
import TagFilter from "@/components/work/TagFilter";
import {
  WORK_TAGS,
  filterByTag,
  fullCases,
  shortCases,
  workCases,
  type WorkTag,
} from "@/lib/work-data";

export const metadata: Metadata = {
  title: "Work — case studies with decisions, metrics and code",
  description:
    "Eight systems built or rebuilt since 2018. Four with the full story: what was broken, what I decided and why, and the proof. Payments, fintech, rescue work, CRM, automation.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work — case studies with decisions, metrics and code | tfpdev",
    description:
      "Eight systems. Four full write-ups: what was broken, what I decided and why, and the proof.",
    url: "/work",
  },
};

function resolveTag(raw: string | string[] | undefined): WorkTag | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return undefined;
  return WORK_TAGS.find((t) => t.toLowerCase() === v.toLowerCase());
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const tag = resolveTag((await searchParams).tag);
  const visible = filterByTag(tag);
  const full = visible.filter((c) => c.full);
  const short = visible.filter((c) => !c.full);

  return (
    <>
      <Navigation />
      <main className="bg-cream">
        {/* ── Header ───────────────────────────────── */}
        <section className="bg-grid border-b-[3px] border-brutal-black pt-28 md:pt-36 pb-10 md:pb-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 md:gap-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                Work
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brutal-black/60">
                {String(workCases.length).padStart(2, "0")} systems · {String(fullCases.length).padStart(2, "0")} full write-ups ·{" "}
                {String(shortCases.length).padStart(2, "0")} short
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
              <h1
                className="lg:col-span-7 font-display font-black uppercase tracking-[-0.05em] leading-[0.82] text-brutal-black"
                style={{
                  fontSize: "clamp(4.5rem, 15vw, 12rem)",
                  textShadow: "0.06em 0.06em 0 #FFE600",
                }}
              >
                Work
              </h1>
              <div className="lg:col-span-5 flex flex-col gap-4 lg:pb-3">
                <p className="font-display text-lg md:text-xl leading-relaxed text-brutal-black/75 max-w-xl">
                  Eight systems I built or rebuilt since 2018. Four have the full story: what was broken, what I decided and why, and the proof. The other four get a row.
                </p>
                <span className="w-fit border-[3px] border-brutal-black bg-brutal-yellow text-brutal-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                  30+ shipped · 3 current clients
                </span>
              </div>
            </div>

            <TagFilter active={tag} />
          </div>
        </section>

        {/* ── Rows ─────────────────────────────────── */}
        <section className="border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {full.length > 0 && (
              <div className="border-t-0">
                {full.map((c) => (
                  <CaseRow key={c.slug} c={c} />
                ))}
              </div>
            )}

            {short.length > 0 && (
              <div className={full.length ? "pt-14 md:pt-20" : ""}>
                <div className="flex items-baseline justify-between gap-4 border-b-[3px] border-brutal-black pb-3">
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">
                    Also shipped
                  </h2>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/60">
                    Index only
                  </span>
                </div>
                {short.map((c) => (
                  <CaseRow key={c.slug} c={c} />
                ))}
              </div>
            )}

            {visible.length === 0 && (
              <p className="py-24 font-mono text-sm text-brutal-black/60">
                Nothing tagged {tag}. Pick another filter.
              </p>
            )}

            <div className="h-16 md:h-24" aria-hidden="true" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

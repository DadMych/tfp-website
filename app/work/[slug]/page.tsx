import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import NdaStamp from "@/components/ui/NdaStamp";
import Metrics from "@/components/work/Metrics";
import ArchDiagram from "@/components/work/ArchDiagram";
import CodeSnippet from "@/components/work/CodeSnippet";
import CaseNav from "@/components/work/CaseNav";
import { adjacentCases, fullCases, getCase } from "@/lib/work-data";

export function generateStaticParams() {
  return fullCases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const c = getCase((await params).slug);
  if (!c) return {};
  const description = `${c.problem} ${c.metrics.map((m) => `${m.value} ${m.label}`).join(" · ")}.`;
  return {
    title: c.title,
    description,
    alternates: { canonical: `/work/${c.slug}` },
    openGraph: {
      title: `${c.title} | tfpdev`,
      description,
      url: `/work/${c.slug}`,
      type: "article",
    },
    twitter: { card: "summary_large_image", title: `${c.title} | tfpdev`, description },
  };
}

const isTodo = (s?: string) => !s || s.startsWith("TODO(");

/** Sticky left label + content. The visible grid of every section. */
function Section({
  n,
  label,
  children,
  tone = "light",
  id,
}: {
  n: string;
  label: string;
  children: React.ReactNode;
  tone?: "light" | "dark";
  id: string;
}) {
  const dark = tone === "dark";
  return (
    <section
      id={id}
      className={`border-b-[3px] py-14 md:py-20 ${
        dark ? "bg-[#0a0a0a] border-cream/15 text-cream" : "bg-cream border-brutal-black text-brutal-black"
      }`}
      aria-labelledby={`${id}-h`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-28 flex lg:flex-col items-baseline lg:items-start gap-4 lg:gap-3">
            <span
              className={`font-mono font-bold text-4xl lg:text-6xl leading-none tracking-[-0.05em] ${
                dark ? "text-brutal-yellow" : "text-brutal-black"
              }`}
              aria-hidden="true"
            >
              {n}
            </span>
            <h2
              id={`${id}-h`}
              className={`font-mono text-[11px] font-bold uppercase tracking-[0.25em] ${
                dark ? "text-cream/60" : "text-brutal-black/60"
              }`}
            >
              {label}
            </h2>
          </div>
        </div>
        <div className="lg:col-span-9 min-w-0">{children}</div>
      </div>
    </section>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-brutal-black bg-white p-4 md:p-5 flex flex-col gap-2 min-w-0">
      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">{label}</dt>
      <dd className="font-display font-bold text-base md:text-lg leading-snug text-brutal-black break-words">{value}</dd>
    </div>
  );
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug);
  if (!c) notFound();

  const { prev, next } = adjacentCases(c.slug);
  const meta = [
    { label: "Region", value: c.region },
    { label: "Role", value: c.role },
    { label: "Duration", value: `${c.period} · ${c.duration}` },
    c.status ? { label: "Status", value: c.status } : null,
    c.team ? { label: "Team", value: c.team } : null,
  ].filter((m): m is { label: string; value: string } => !!m && !isTodo(m.value));

  let n = 0;
  const num = () => String(++n).padStart(2, "0");

  return (
    <>
      <Navigation />
      <main>
        {/* ── 1. Header ────────────────────────────── */}
        <header className="bg-cream bg-grid border-b-[3px] border-brutal-black pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 md:gap-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/work"
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-brutal-black/60 hover:text-brutal-black transition-colors"
              >
                <span aria-hidden="true">←</span> All work
              </Link>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brutal-black/60">
                Case {c.index} / {String(fullCases.length).padStart(2, "0")}
              </span>
            </div>

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
                    >
                      {t}
                    </span>
                  ))}
                  {c.nda && <NdaStamp className="ml-1" />}
                </div>
                <h1
                  className="font-display font-black uppercase tracking-[-0.04em] leading-[0.88] text-brutal-black"
                  style={{ fontSize: "clamp(2.6rem, 6.5vw, 5.75rem)" }}
                >
                  {c.title}
                </h1>
                <p className="font-display text-lg md:text-2xl leading-relaxed text-brutal-black/75 max-w-3xl">
                  {c.problem}
                </p>
              </div>

              <div className="lg:col-span-4 lg:pt-14">
                <Metrics metrics={c.metrics} />
              </div>
            </div>

            <dl className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${meta.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
              {meta.map((m) => (
                <MetaBox key={m.label} label={m.label} value={m.value} />
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-black/60 mr-2">
                Stack
              </span>
              {c.stack.map((s) => (
                <span
                  key={s}
                  className="inline-block border-[2px] border-brutal-black bg-cream px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* ── 2. Broken / needed ───────────────────── */}
        {c.context && (
          <Section n={num()} label={c.context.heading} id="context">
            <div className="flex flex-col gap-6 max-w-3xl">
              {c.context.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`font-display leading-relaxed ${
                    i === 0 ? "text-xl md:text-2xl font-medium text-brutal-black" : "text-base md:text-lg text-brutal-black/80"
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
          </Section>
        )}

        {/* ── 3. What I did ────────────────────────── */}
        {c.decisions && (
          <Section n={num()} label="What I did" id="decisions">
            <ol className="flex flex-col">
              {c.decisions.map((d, i) => (
                <li
                  key={d.title}
                  className="grid grid-cols-1 md:grid-cols-[3.5rem_1fr] gap-x-6 gap-y-4 border-t-[3px] border-brutal-black py-8 md:py-10 first:border-t-0 first:pt-0"
                >
                  <span className="font-mono font-bold text-2xl text-brutal-black/55 leading-none" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-5 min-w-0">
                    <h3 className="font-display font-black uppercase tracking-[-0.02em] leading-[1] text-2xl md:text-3xl text-brutal-black">
                      {d.title}
                    </h3>
                    <p className="font-display text-base md:text-lg leading-relaxed text-brutal-black/80 max-w-3xl">{d.what}</p>
                    <div className="relative border-[3px] border-brutal-black bg-white p-5 md:p-6 max-w-3xl shadow-brutal-sm">
                      <span className="absolute -top-3 left-4 inline-block bg-brutal-yellow border-[2px] border-brutal-black px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.25em]">
                        Why
                      </span>
                      <p className="font-display text-base leading-relaxed text-brutal-black">{d.why}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* ── 4. Proof ─────────────────────────────── */}
        <Section n={num()} label="Proof" id="proof" tone="dark">
          <div className="flex flex-col gap-12 md:gap-16">
            <Metrics metrics={c.metrics} tone="dark" variant="block" />
            {c.diagram && (
              <div className="flex flex-col gap-4">
                <p className="font-display text-lg md:text-xl text-cream/85 max-w-3xl">{c.diagram.title}</p>
                <ArchDiagram diagram={c.diagram} id={c.slug} />
              </div>
            )}
            {c.snippet && (
              <div className="flex flex-col gap-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-cream/50">The key fix</p>
                <CodeSnippet snippet={c.snippet} />
              </div>
            )}
          </div>
        </Section>

        {/* ── 5. What I'd do differently ───────────── */}
        {c.differently && c.differently.length > 0 && (
          <Section n={num()} label="What I would do differently" id="differently">
            <ul className="flex flex-col gap-5 max-w-3xl">
              {c.differently.map((d, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-4 items-start">
                  <span className="font-mono text-sm font-bold text-brutal-black/60 pt-1" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-display text-base md:text-lg leading-relaxed text-brutal-black/85 border-l-[3px] border-brutal-yellow pl-4">
                    {d}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── 6. Stack ─────────────────────────────── */}
        <Section n={num()} label="Stack" id="stack">
          <ul className="flex flex-wrap gap-3">
            {c.stack.map((s) => (
              <li
                key={s}
                className="border-[3px] border-brutal-black bg-white px-4 py-2.5 font-mono text-sm font-bold tracking-wide shadow-brutal-sm"
              >
                {s}
              </li>
            ))}
          </ul>
        </Section>

        {/* ── 7. Next / previous + CTA ─────────────── */}
        <CaseNav prev={prev} next={next} />
      </main>
      <Footer />
    </>
  );
}

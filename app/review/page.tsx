import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import RiskCheck from "@/components/review/RiskCheck";
import { siteConfig } from "@/lib/data";
import { getLiveDemo } from "@/lib/lab-config";
import { auditAreas, offer } from "@/lib/review";

export const metadata: Metadata = {
  title: "Application Audit — where your app loses money, data or trust, in writing",
  description:
    "Five days inside the app you're about to launch: access, payments, the AI, the data, and the infra around it. A ranked list of what's wrong, with the fix for each. Start with a 2-minute self-check.",
  alternates: { canonical: "/review" },
  openGraph: {
    title: "Application Audit",
    description: "I go through the app you're about to launch and tell you where it loses money, data or trust. Ranked. With the fix for each.",
    url: "/review",
  },
};

const todo = (s: string) => s.startsWith("TODO(oleksii)");

export default function ReviewPage() {
  const auditLive = !!getLiveDemo("audit");
  return (
    <>
      <Navigation />
      <main className="bg-cream">
        {/* hero */}
        <section className="bg-grid border-b-[3px] border-brutal-black pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-7">
            <span className="w-fit inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">{offer.kicker}</span>
            <h1 className="font-display font-black uppercase tracking-[-0.05em] leading-[0.85] text-brutal-black" style={{ fontSize: "clamp(3rem, 10vw, 8.5rem)", textShadow: "0.06em 0.06em 0 #FFE600" }}>
              Application
              <br />
              Audit
            </h1>
            <p className="font-display text-xl md:text-2xl leading-snug text-brutal-black max-w-3xl">{offer.promise}</p>
            <dl className="flex flex-wrap gap-x-10 gap-y-3 font-mono text-sm">
              <Fact label="Takes" value={offer.duration} />
              <Fact label="Costs" value={offer.price} />
              <Fact label="You get" value="A written, ranked report and the fixes" />
            </dl>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="#check"
                className="border-[3px] border-brutal-black bg-brutal-black text-cream px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-brutal hover:shadow-brutal-hover hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                2-minute self-check ↓
              </a>
              <a
                href={siteConfig.calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-[3px] border-brutal-black bg-white px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow transition-colors"
              >
                Book an intro call →
              </a>
            </div>
          </div>
        </section>

        {/* who */}
        <section className="border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16">
            <h2 className="font-display font-black uppercase tracking-[-0.03em] text-3xl md:text-4xl leading-none">Who this is for</h2>
            <div className="flex flex-col gap-6">
              <ul className="flex flex-col divide-y-[3px] divide-brutal-black border-y-[3px] border-brutal-black">
                {offer.who.map((w, i) => (
                  <li key={i} className="flex gap-5 py-5">
                    <span className="font-display font-black text-2xl leading-none shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <p className="font-display text-lg leading-snug">{w}</p>
                  </li>
                ))}
              </ul>
              <p className="font-mono text-xs leading-relaxed text-brutal-black/60 max-w-2xl">{offer.notFor}</p>
            </div>
          </div>
        </section>

        {/* self-check */}
        <section id="check" className="border-b-[3px] border-brutal-black bg-dirty-cream/40 scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 flex flex-col gap-10">
            <div className="flex flex-col gap-4 max-w-3xl">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">Self-check · payments · 10 questions · no email</span>
              <h2 className="font-display font-black uppercase tracking-[-0.03em] text-3xl md:text-5xl leading-none">What would I find in your payments?</h2>
              <p className="font-display text-lg leading-relaxed text-brutal-black/75">
                The fastest area to check yourself. Answer honestly; “not sure” is an answer. You get the list of what is probably wrong, in the order I would look, and a link you can send to your engineer.
              </p>
            </div>
            <RiskCheck />
          </div>
        </section>

        {/* what I check */}
        <section className="border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 flex flex-col gap-10">
            <div className="flex flex-col gap-3 max-w-3xl">
              <h2 className="font-display font-black uppercase tracking-[-0.03em] text-3xl md:text-4xl leading-none">What I check</h2>
              <p className="font-display text-lg leading-relaxed text-brutal-black/75">Five areas where an app that works in a demo quietly fails in production. Each one is reproduced live in the lab, against a real Postgres, so you can see the failure before you believe me.</p>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {auditAreas.map((a, i) => {
                const linked = a.id !== "infra" || auditLive;
                return (
                  <li key={a.id} className="flex flex-col gap-4 border-[3px] border-brutal-black bg-white p-6 shadow-brutal">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold tracking-[0.2em] text-brutal-black/60">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/40">{a.part.label}</span>
                    </div>
                    <h3 className="font-display font-black uppercase text-2xl tracking-[-0.02em] leading-none">{a.title}</h3>
                    <p className="font-display text-base leading-relaxed text-brutal-black/80">{a.failure}</p>
                    <p className="font-mono text-xs leading-relaxed text-brutal-black/65">
                      <span className="font-bold uppercase tracking-[0.15em]">I check: </span>
                      {a.check}
                    </p>
                    {linked && (
                      <Link href={a.part.href} className="mt-auto w-fit font-mono text-xs font-bold uppercase tracking-[0.2em] underline decoration-[2px] underline-offset-4 hover:bg-brutal-yellow">
                        See it happen →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* how it works */}
        <section className="border-b-[3px] border-brutal-black bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16">
            <div className="flex flex-col gap-4">
              <h2 className="font-display font-black uppercase tracking-[-0.03em] text-3xl md:text-4xl leading-none">How it works</h2>
              <p className="font-display text-base leading-relaxed text-brutal-black/70">Read access and one hour of your engineer&apos;s time. That is the whole ask.</p>
            </div>
            <div className="flex flex-col gap-10">
              <ol className="flex flex-col border-y-[3px] border-brutal-black divide-y-[3px] divide-brutal-black">
                {offer.days.map((d) => (
                  <li key={d.when} className="grid grid-cols-[6.5rem_1fr] gap-5 py-5">
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] pt-1">{d.when}</span>
                    <p className="font-display text-lg leading-snug">{d.what}</p>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brutal-black/60">You get</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {offer.deliverables.map((d) => (
                    <li key={d} className="flex gap-3 border-l-[3px] border-brutal-black pl-4 font-display text-base leading-snug">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* proof */}
        <section className="border-b-[3px] border-brutal-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16">
            <h2 className="font-display font-black uppercase tracking-[-0.03em] text-3xl md:text-4xl leading-none">From production, not from a book</h2>
            <div className="flex flex-col gap-6">
              <p className="font-display text-lg leading-relaxed text-brutal-black/80 max-w-3xl">
                The list above is not a framework. It is the bugs I have met in code I was paid to fix or build: a refund that could run twice, a client who could open another&apos;s data, balance checks that did not hold. The cases have what I can say under NDA.
              </p>
              {auditLive && (
                <Link href="/lab/audit/report" className="w-fit border-[3px] border-brutal-black bg-brutal-yellow px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-brutal hover:shadow-brutal-hover hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
                  Read a full report, start to finish →
                </Link>
              )}
              <div className="flex flex-wrap gap-4">
                <Link href="/work/ticketing-rescue" className="border-[3px] border-brutal-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow transition-colors">
                  Ticketing rescue →
                </Link>
                <Link href="/work/crypto-card" className="border-[3px] border-brutal-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow transition-colors">
                  Crypto card →
                </Link>
                <Link href="/lab/money" className="border-[3px] border-brutal-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-brutal-yellow transition-colors">
                  The lab →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* cta */}
        <section className="bg-brutal-black text-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
            <div className="flex flex-col gap-4">
              <h2 className="font-display font-black uppercase tracking-[-0.04em] leading-[0.9] text-4xl md:text-6xl">
                Find out before
                <br />
                <span className="text-brutal-yellow">your customers do.</span>
              </h2>
              <p className="font-display text-lg text-cream/75 max-w-xl">
                Thirty minutes. You describe how your product works; I tell you what I would look at first and whether the audit is worth your money.
              </p>
            </div>
            <a
              href={siteConfig.calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border-[3px] border-cream bg-brutal-yellow text-brutal-black px-8 py-5 font-display font-black uppercase text-xl tracking-[-0.02em] hover:bg-cream transition-colors"
            >
              Book the call →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-bold uppercase tracking-[0.2em] text-[11px] text-brutal-black/60">{label}</dt>
      <dd className={todo(value) ? "bg-brutal-yellow px-1 font-bold" : ""}>{value}</dd>
    </div>
  );
}

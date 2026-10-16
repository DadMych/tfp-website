import Link from "next/link";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getLiveDemo } from "@/lib/lab-config";

/**
 * Shared frame for every /lab demo. Draft demos 404 here, so a route file
 * can exist in the repo without existing on the site.
 */
export default function DemoShell({ slug, children }: { slug: string; children?: React.ReactNode }) {
  const demo = getLiveDemo(slug);
  if (!demo) notFound();

  return (
    <>
      <Navigation />
      <main className="bg-cream">
        <header className="bg-grid border-b-[3px] border-brutal-black pt-28 md:pt-36 pb-10 md:pb-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
            <Link
              href="/lab"
              className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-brutal-black/60 hover:text-brutal-black transition-colors w-fit"
            >
              <span aria-hidden="true">←</span> Lab
            </Link>
            <h1
              className="font-display font-black uppercase tracking-[-0.04em] leading-[0.88] text-brutal-black"
              style={{ fontSize: "clamp(2.6rem, 7.5vw, 6.5rem)" }}
            >
              {demo.title}
            </h1>
            <p className="font-display text-lg md:text-2xl leading-relaxed text-brutal-black/75 max-w-3xl">{demo.proves}</p>
            <div className="flex flex-wrap gap-2">
              {demo.stack.map((s) => (
                <span key={s} className="inline-block border-[2px] border-brutal-black px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </header>
        <section className="py-14 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
        </section>
      </main>
      <Footer />
    </>
  );
}

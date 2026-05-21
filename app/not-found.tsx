import Link from "next/link";
import type { Metadata } from "next";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "404 — Page not found",
  description: "This page doesn't exist. Let's get you somewhere useful.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Navigation />
      <main className="bg-cream bg-grid min-h-screen pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12">

          {/* ── Massive 404 ─────────────────────────────── */}
          <div className="relative">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-brutal-black/40 mb-4">
              Error · 404 · Page not found
            </p>
            <h1
              className="font-display font-black italic text-brutal-black leading-[0.85] tracking-[-0.05em] select-none"
              style={{ fontSize: "clamp(8rem, 28vw, 22rem)" }}
            >
              404<span className="text-brutal-yellow">.</span>
            </h1>
          </div>

          {/* ── Message ─────────────────────────────────── */}
          <div className="flex flex-col gap-6 max-w-2xl">
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl uppercase tracking-[-0.03em] leading-[1] text-brutal-black">
              This page doesn&apos;t exist.
              <br />
              <span className="text-brutal-black/45">
                Or it shipped to production without me.
              </span>
            </h2>
            <p className="font-display text-base sm:text-lg text-brutal-black/65 leading-relaxed">
              Wrong URL, dead link, or something I deleted in a refactor. Either
              way — nothing useful lives here. Let&apos;s get you back to
              somewhere that does.
            </p>
          </div>

          {/* ── Suggestions ─────────────────────────────── */}
          <div className="border-[3px] border-brutal-black bg-white p-7 md:p-8 flex flex-col gap-5"
            style={{ boxShadow: "6px 6px 0px 0px #000000" }}
          >
            <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
              Try one of these
            </span>

            <ul className="flex flex-col gap-3">
              {[
                { href: "/", label: "Home — what I do, who I do it for" },
                { href: "/#services", label: "Services — CTO, MVP, payments, automation" },
                { href: "/#projects", label: "Projects — what I’ve shipped" },
                { href: "/insights", label: "Insights — 24 decisions from real builds" },
                { href: "/start", label: "Start a project — 60-second quiz, then talk" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-baseline gap-3 font-display font-bold text-base sm:text-lg text-brutal-black hover:text-brutal-yellow transition-colors duration-150"
                  >
                    <span className="font-mono text-xs text-brutal-black/40 group-hover:text-brutal-yellow transition-colors">
                      →
                    </span>
                    <span className="underline underline-offset-4 decoration-2 decoration-brutal-black/20 group-hover:decoration-brutal-yellow transition-colors">
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Footer line ─────────────────────────────── */}
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brutal-black/35">
            Found a broken link from somewhere? Let me know — oleksii@tfpdev.com
          </p>
        </div>
      </main>
    </>
  );
}

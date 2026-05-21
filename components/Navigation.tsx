"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/lib/data";

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Services",        anchor: "services"  },
  { label: "Projects",        anchor: "projects"  },
  { label: "About",           anchor: "about"     },
  { label: "Insights",        anchor: null, href: "/insights", badge: "NEW" },
  { label: "Start a Project", anchor: null, href: "/start"    },
];

export default function Navigation() {
  const pathname = usePathname();
  const isOffHome = pathname !== "/";

  const openCalendly = () => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: siteConfig.calendlyUrl });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brutal-black border-b-[3px] border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-3 lg:gap-5">

        {/* ── Logo ─────────────────────────────────── */}
        <Link
          href="/"
          className="font-mono font-bold text-xl tracking-tight text-brutal-yellow flex-shrink-0"
        >
          tfpdev
        </Link>

        {/* ── Availability indicator (compact) ─────── */}
        <div className="hidden md:flex items-center gap-2 border-[2px] border-brutal-green/60 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-brutal-green flex-shrink-0 whitespace-nowrap">
          <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-brutal-green flex-shrink-0" />
          {siteConfig.availability.nav}
        </div>

        {/* ── Nav links — desktop only ─────────────── */}
        <nav className="hidden lg:flex items-center gap-5 flex-shrink-0 mr-auto">
          {NAV_ITEMS.map((item) => {
            const href = item.href
              ? item.href
              : isOffHome
              ? `/#${item.anchor}`
              : `#${item.anchor}`;

            const isActive = !!(item.href && pathname === item.href);

            return (
              <Link
                key={item.label}
                href={href}
                className={`font-display font-bold text-xs uppercase tracking-[0.12em] transition-colors duration-150 hover:text-brutal-yellow flex items-center gap-1 ${
                  isActive ? "text-brutal-yellow" : "text-cream"
                }`}
              >
                {item.label}
                {item.badge && (
                  <span className="inline-block bg-brutal-yellow text-brutal-black font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rotate-[2deg] leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Right cluster: contact icons + CTA ───── */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Email — icon on md, full text on 2xl */}
          <a
            href={`mailto:${siteConfig.email}`}
            aria-label="Email Oleksii"
            title={siteConfig.email}
            className="hidden md:flex items-center gap-2 text-cream/45 hover:text-brutal-yellow transition-colors duration-150"
          >
            <MailIcon size={16} />
            <span className="hidden 2xl:inline font-mono text-xs lowercase tracking-tight">
              {siteConfig.email}
            </span>
          </a>

          {/* LinkedIn — icon */}
          <a
            href={siteConfig.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            title="LinkedIn"
            className="hidden md:flex items-center text-cream/45 hover:text-brutal-yellow transition-colors duration-150"
          >
            <LinkedInIcon size={16} />
          </a>

          {/* Divider before CTA */}
          <span className="hidden md:inline-block w-px h-5 bg-white/10 mx-1" aria-hidden="true" />

          {/* Primary CTA */}
          <button
            onClick={openCalendly}
            className="inline-flex items-center justify-center border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-display font-bold uppercase text-xs tracking-wide px-3 sm:px-4 py-2 shadow-brutal-sm hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150 cursor-pointer whitespace-nowrap"
          >
            <span className="hidden sm:inline">Free Intro Call</span>
            <span className="sm:hidden">Free Call</span>
          </button>
        </div>
      </div>
    </header>
  );
}

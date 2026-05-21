"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/lib/data";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">

        {/* Logo */}
        <Link
          href="/"
          className="font-mono font-bold text-xl tracking-tight text-brutal-yellow flex-shrink-0"
        >
          tfpdev
        </Link>

        {/* Availability indicator */}
        <div className="hidden sm:flex items-center gap-2 border-[2px] border-brutal-green/60 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-brutal-green">
          <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-brutal-green flex-shrink-0" />
          Available · {siteConfig.availability.nav}
        </div>

        {/* Nav links — desktop only */}
        <nav className="hidden lg:flex items-center gap-5 flex-shrink-0">
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

        <div className="flex items-center gap-4 flex-shrink-0">
          <a
            href={`mailto:${siteConfig.email}`}
            className="hidden md:inline font-mono font-bold text-xs lowercase tracking-tight text-cream/60 hover:text-brutal-yellow transition-colors duration-150"
          >
            {siteConfig.email}
          </a>
          <a
            href={siteConfig.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline font-display font-bold text-xs uppercase tracking-[0.12em] text-cream/50 hover:text-brutal-yellow transition-colors duration-150"
          >
            LinkedIn
          </a>
          <button
            onClick={openCalendly}
            className="inline-flex items-center justify-center border-[3px] border-brutal-yellow bg-brutal-yellow text-brutal-black font-display font-bold uppercase text-xs tracking-wide px-4 py-2 shadow-brutal-sm hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150 cursor-pointer"
          >
            Free Intro Call
          </button>
        </div>
      </div>
    </header>
  );
}

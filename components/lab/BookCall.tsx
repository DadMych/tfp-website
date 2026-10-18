"use client";

import { siteConfig } from "@/lib/data";

/** Button that opens the Calendly popup. Yellow, or outlined next to another primary button. */
export default function BookCall({ children, className = "", outline = false }: { children: React.ReactNode; className?: string; outline?: boolean }) {
  const open = () => {
    const w = window as unknown as { Calendly?: { initPopupWidget: (o: { url: string }) => void } };
    w.Calendly?.initPopupWidget({ url: siteConfig.calendlyUrl });
  };
  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center justify-center gap-2 border-[3px] border-brutal-black ${outline ? "bg-white hover:bg-brutal-yellow" : "bg-brutal-yellow"} text-brutal-black font-display font-black uppercase tracking-[-0.01em] whitespace-nowrap cursor-pointer shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-[transform,box-shadow] duration-150 ${className}`}
    >
      {children}
    </button>
  );
}

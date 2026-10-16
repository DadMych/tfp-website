import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { liveModules } from "@/lib/money-lab";

export const GAME_COUNT = 8;

const TICK_COLORS = ["#FFE600", "#FF5CAA", "#C6FF3D", "#B79CFF", "#FF8A3D", "#4ECDC4"];

export interface HubDef {
  title: [string, string];
  lede: string;
  tabs: { id: string; href: string | null; label: string; count: number | null; sub: string }[];
  ticker: string[];
}

const MONEY_HUB: HubDef = {
  title: ["Where money", "goes missing."],
  lede: "Every way a payment system loses money, as a game you can break and an article that shows the real fix.",
  tabs: [
    { id: "games", href: "/lab/money/games", label: "Games", count: GAME_COUNT, sub: "Break it in the browser" },
    { id: "articles", href: "/lab/money/articles", label: "Articles", count: liveModules.length, sub: "Same bugs on a real Postgres" },
  ],
  ticker: ["Double-spend", "Retry storm", "Float drift", "Refund twice", "Late webhooks", "Lost cents", "Crons that run twice", "Half-written ledgers"],
};

/** Frame for a lab's list pages: one hero, two tabs. Money Lab unless `def` says otherwise. */
export default function Hub({ tab, def = MONEY_HUB, children }: { tab: string; def?: HubDef; children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="bg-cream overflow-x-clip">
        <section className="bg-grid pt-28 md:pt-36 pb-10 md:pb-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
            <div className="flex flex-col gap-8">
              <h1 className="font-display font-black uppercase tracking-[-0.06em] leading-[0.8] text-brutal-black" style={{ fontSize: "clamp(3rem, 10.5vw, 9.5rem)" }}>
                <span className="block" style={{ textShadow: "0.05em 0.05em 0 #FF5CAA" }}>{def.title[0]}</span>
                <span className="inline-block whitespace-nowrap rotate-1 bg-brutal-yellow border-[4px] border-brutal-black px-[0.08em] mt-[0.12em] shadow-[10px_10px_0_0_#000]">{def.title[1]}</span>
              </h1>
              <p className="font-display text-xl md:text-2xl leading-snug text-brutal-black max-w-2xl">{def.lede}</p>
            </div>

            <nav aria-label="Lab sections" className="grid grid-cols-2 border-[3px] border-brutal-black shadow-[10px_10px_0_0_#000] bg-white">
              {def.tabs.map((t, i) => {
                const on = t.id === tab;
                const cls = `flex items-baseline justify-between gap-3 px-5 md:px-8 py-5 md:py-6 transition-colors ${i === 0 ? "border-r-[3px] border-brutal-black" : ""} ${on ? "bg-brutal-yellow" : t.href ? "hover:bg-cream" : "opacity-50"}`;
                const inner = (
                  <>
                    <span className="flex flex-col gap-1 min-w-0">
                      <span className="font-display font-black uppercase tracking-[-0.04em] text-3xl md:text-5xl leading-none">{t.label}</span>
                      <span className="hidden sm:block font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-brutal-black/60">{t.sub}</span>
                    </span>
                    <span className={`shrink-0 font-mono text-xs md:text-sm font-bold px-2 py-1 ${on ? "bg-brutal-black text-brutal-yellow" : "border-[2px] border-brutal-black"}`}>{t.count === null ? "Soon" : String(t.count).padStart(2, "0")}</span>
                  </>
                );
                return t.href ? (
                  <Link key={t.id} href={t.href} aria-current={on ? "page" : undefined} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <span key={t.id} className={cls}>
                    {inner}
                  </span>
                );
              })}
            </nav>
          </div>
        </section>

        <div className="border-y-[3px] border-brutal-black bg-brutal-black py-3 overflow-hidden" aria-hidden="true">
          <div className="animate-marquee-left">
            {[0, 1].map((r) => (
              <div key={r} className="flex shrink-0">
                {def.ticker.map((t, i) => (
                  <span key={t} className="px-6 font-display font-black uppercase text-2xl md:text-3xl tracking-[-0.03em] whitespace-nowrap" style={{ color: TICK_COLORS[i % TICK_COLORS.length] }}>
                    {t} <span className="text-cream/40">✶</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {children}
      </main>
      <Footer />
    </>
  );
}

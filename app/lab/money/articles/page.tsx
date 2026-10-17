import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import { notFound } from "next/navigation";
import Hub from "@/components/lab/money/Hub";
import ArticleGrid from "@/components/lab/ArticleGrid";
import { sql } from "@/lib/db";
import { getLiveDemo } from "@/lib/lab-config";
import { formatCents, liveModules } from "@/lib/money-lab";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta("/lab/money/articles", "Articles — Money Lab", "Race a balance, replay a webhook, refund twice. Each article rebuilds a bug from a real project against Postgres, then shows the version that holds.");

async function counters(): Promise<Record<string, number>> {
  try {
    const rows = await sql<{ key: string; value: string }>("SELECT key, value::text FROM lab.counters");
    return Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  } catch {
    return {};
  }
}

export default async function ArticlesPage() {
  const lab = getLiveDemo("money");
  if (!lab) notFound();
  const c = await counters();
  const attacks = c.ds_attacks_total ?? 0;
  const extracted = c.ds_extracted_cents ?? 0;

  return (
    <Hub tab="articles">
        {extracted > 0 && (
          <section className="border-b-[3px] border-brutal-black bg-[#3B5BFF] text-cream">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div>
                <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-cream/70">Visitors have attacked the naive balance</span>
                <span className="block font-display font-black text-5xl md:text-7xl leading-none tracking-[-0.04em] mt-2">{attacks.toLocaleString("en-US")}×</span>
              </div>
              <div className="sm:text-right">
                <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-cream/70">and walked out with money that never existed</span>
                <span className="block font-display font-black text-5xl md:text-7xl leading-none tracking-[-0.04em] mt-2 text-[#C6FF3D]">{formatCents(extracted)}</span>
              </div>
            </div>
          </section>
        )}

        <ArticleGrid base="/lab/money" modules={liveModules} counters={c} />
    </Hub>
  );
}

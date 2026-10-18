import Link from "next/link";
import { PartTile } from "@/components/lab/PartCard";
import { PartHeadline } from "@/components/lab/PartProofs";
import { liveDemos } from "@/lib/lab-config";

/** The Lab on the home page: one compact tile per live Part, in story order. */
export default function LabBlock() {
  const parts = [...liveDemos].sort((a, b) => a.part - b.part);
  if (parts.length === 0) return null;

  return (
    <section id="lab" className="bg-cream border-b-[3px] border-brutal-black py-16 md:py-24 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 md:gap-12">
        <div className="flex flex-col gap-4">
          <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
            The Lab
          </span>
          <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
            I made up a company.
            <br />
            <span className="inline-block whitespace-nowrap -rotate-1 bg-brutal-yellow border-[3px] border-brutal-black px-[0.08em] mt-[0.12em] shadow-[6px_6px_0_0_#000]">
              Then I broke it.
            </span>
          </h2>
          <p className="font-display text-lg md:text-xl leading-snug text-brutal-black/75 max-w-2xl">
            Northwind Studio is fictional. The demos are live: press the buttons, then read the code that stops it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-flow-col xl:auto-cols-fr gap-5">
          {parts.map((d) => (
            <PartTile key={d.slug} d={d} proof={<PartHeadline slug={d.slug} />} />
          ))}
        </div>

        <Link href="/lab#company" className="w-fit font-mono text-xs font-bold uppercase tracking-[0.2em] border-b-[3px] border-brutal-black hover:bg-brutal-yellow">
          Meet Northwind →
        </Link>
      </div>
    </section>
  );
}

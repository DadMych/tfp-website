import BookCall from "./BookCall";
import { T } from "./money/Explain";
import { siteConfig } from "@/lib/data";

/** Closing call-to-action of a chapter. `children` go under it, separated by a rule. */
// TODO(oleksii): CTA wording.
export default function CallBox({ children }: { children?: React.ReactNode }) {
  return (
    <section className="border-[3px] border-brutal-black bg-white p-5 md:p-8 shadow-[10px_10px_0_0_#000] flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase tracking-[-0.05em] text-3xl md:text-5xl leading-[0.9]">
            <T tech="Not sure your system has this?" plain="Not sure this could happen to you?" />
          </h2>
          <p className="font-display text-base md:text-lg leading-snug text-brutal-black/80 max-w-2xl">
            <T
              tech="That's what the call is for. Walk me through how it works, and I'll tell you what applies and what I'd check first."
              plain="That's what the call is for. Tell me how your product works, and I'll tell you what applies to you and what I'd check first."
            />
          </p>
        </div>
        <BookCall className="px-6 py-4 text-xl w-fit max-w-full max-md:whitespace-normal max-md:text-balance">
          <span>Book a free {siteConfig.callMinutes}-min call</span> <span aria-hidden="true">→</span>
        </BookCall>
      </div>
      {children && <div className="border-t-[3px] border-brutal-black pt-5">{children}</div>}
    </section>
  );
}

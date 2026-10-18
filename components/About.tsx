import { stats, timeline, clientQuote, aboutLine, siteConfig } from "@/lib/data";

export default function About() {
  return (
    <section id="about" className="bg-cream border-b-[3px] border-brutal-black py-20 md:py-28 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-16">

        {/* Top: bio + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — bio */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest w-fit">
                About
              </span>
              <h2 className="font-display font-black text-5xl md:text-6xl leading-[0.95] text-brutal-black uppercase tracking-[-0.03em]">
                The short<br />version.
              </h2>
            </div>

            <div className="flex flex-col gap-4 font-display text-base sm:text-lg text-brutal-black/75 leading-relaxed">
              <p>
                {clientQuote.context} He said: &ldquo;{clientQuote.text}&rdquo;
              </p>
              <p>
                That changed how I think about this craft. The startup world is
                full of brilliant engineers who disappear mid-project.
                Founders aren&apos;t actually shopping for the smartest engineer
                — they&apos;re shopping for the one who&apos;ll still be there
                in six months, answering messages and shipping on schedule.
              </p>
              <p>
                I&apos;m not the most brilliant engineer you can hire.
                I&apos;m the one who&apos;ll still be here Monday morning.
                BSc in Computer Science from Kyiv Polytechnic. Based in
                Barcelona, covering EU and US East Coast timezones.
              </p>
              <p className="font-bold text-brutal-black">{aboutLine}</p>
              <p className="font-black text-brutal-black uppercase tracking-tight">
                I take on 2–3 clients at a time.
                <br />Every engagement gets deep focus.
              </p>
            </div>

            {/* Stickers */}
            <div className="flex flex-wrap gap-3">
              <a
                href={siteConfig.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-[3px] border-brutal-black bg-white px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide rotate-2 hover:bg-brutal-yellow transition-colors duration-150"
              >
                LinkedIn →
              </a>
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-yellow px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide -rotate-1">
                9 YEARS. STILL SHIPPING.
              </span>
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-blue px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide rotate-1">
                Based in Barcelona
              </span>
              <span className="inline-block border-[3px] border-brutal-black bg-brutal-coral px-3 py-1.5 font-mono text-xs font-bold shadow-brutal-sm uppercase tracking-wide -rotate-1">
                Your reputation is my reputation.
              </span>
            </div>
          </div>

          {/* Right — stat stickers */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`p-7 border-[3px] border-brutal-black flex flex-col gap-2 shadow-[5px_5px_0_0_#000] ${stat.rotate} transition-transform duration-150 hover:rotate-0`}
                  style={{ backgroundColor: stat.accentHex }}
                >
                  <div className="font-display font-black text-5xl sm:text-6xl text-brutal-black leading-none">
                    {stat.value}
                  </div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-brutal-black/60">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Pull quote */}
            <div className="border-[3px] border-brutal-black bg-brutal-black p-6 relative overflow-hidden">
              <div
                className="absolute -top-4 -left-2 font-display font-black text-[8rem] leading-none text-brutal-yellow select-none pointer-events-none"
                style={{ opacity: 0.15 }}
                aria-hidden="true"
              >
                &ldquo;
              </div>
              <p className="relative z-10 font-display font-bold text-base sm:text-lg text-cream leading-relaxed">
                &ldquo;When you say it&apos;ll be done Friday — it&apos;s done
                Friday. You don&apos;t disappear. You just do the work.&rdquo;
                <br />
                <span className="text-brutal-yellow font-black">
                  — {clientQuote.attribution}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Timeline ruler */}
        <div className="flex flex-col gap-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brutal-black/40">
            Timeline
          </p>

          {/* desktop ruler */}
          <div className="hidden md:block relative pt-7">
            <span aria-hidden="true" className="absolute top-7 left-0 right-0 h-[4px] bg-brutal-black" />
            <div className="relative grid grid-cols-6">
              {timeline.map((item, i) => {
                const last = i === timeline.length - 1;
                return (
                  <div key={item.year} className="relative flex flex-col gap-2 pl-5 pr-4">
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-7 -translate-y-1/2 ${last ? "h-4 w-4 border-[2px] border-brutal-black bg-brutal-yellow" : "h-5 w-[4px] bg-brutal-black"}`}
                    />
                    <span className={`mt-6 w-fit font-mono text-sm font-black uppercase tracking-widest ${last ? "bg-brutal-yellow border-[2px] border-brutal-black px-1.5 text-brutal-black" : "text-brutal-black"}`}>
                      {item.year}
                    </span>
                    <span className="font-display text-sm text-brutal-black/70 leading-snug">
                      {item.event}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* mobile vertical ruler */}
          <div className="md:hidden relative flex flex-col gap-6 pl-6">
            <span aria-hidden="true" className="absolute left-[6px] top-2 bottom-2 w-[4px] bg-brutal-black" />
            {timeline.map((item, i) => {
              const last = i === timeline.length - 1;
              return (
                <div key={item.year} className="relative flex flex-col gap-1">
                  <span aria-hidden="true" className={`absolute -left-6 top-1 ${last ? "h-4 w-4 border-[2px] border-brutal-black bg-brutal-yellow" : "h-3 w-3 bg-brutal-black"}`} />
                  <span className={`w-fit font-mono text-sm font-black uppercase tracking-widest ${last ? "bg-brutal-yellow border-[2px] border-brutal-black px-1.5" : "text-brutal-black"}`}>
                    {item.year}
                  </span>
                  <span className="font-display text-sm text-brutal-black/70 leading-snug">
                    {item.event}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

import { T } from "@/components/lab/money/Explain";

const PEOPLE = [
  ["Oleksij van Koeropatkin", "Founder, studio director"],
  ["Vladislava Wolinska", "Head of PR"],
  ["Maksim Ryzjikov", "Operations and finance"],
  ["Vladimir Posjivalov", "Senior lawyer"],
  ["Sofie Milkova", "Lawyer"],
  ["Vladislav Boerdonos", "Account lead"],
  ["Sandra Tsapljoek", "Account lead"],
  ["Michiel Dembitski", "Design systems lead"],
  ["Varvara Handoga", "Senior designer, brand"],
  ["Vlas Koerbatski", "Senior designer, web"],
  ["Tomás Pereira", "Senior designer, product"],
  ["Kwame Mensah", "Senior designer, motion"],
  ["Noor Hassan", "Designer"],
  ["Leon Pavlov", "Designer"],
  ["Eva de Groot", "Designer"],
  ["Yara Haddad", "Junior designer"],
] as const;

const COLORS = ["#FFE600", "#FF5CAA", "#C6FF3D", "#B79CFF", "#FF8A3D", "#4ECDC4"];

const initials = (n: string) =>
  n
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

/** The made-up company every Part of the lab runs on: who it is and who works there. */
export default function NorthwindDossier() {
  return (
    <section id="company" className="border-t-[3px] border-brutal-black scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-10 lg:gap-14">
        <div className="flex flex-col gap-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-60">The company</span>
          <div className="relative border-[3px] border-brutal-black bg-white shadow-[8px_8px_0_0_#000] p-6 md:p-7 flex flex-col gap-5">
            <span className="absolute -top-3 right-5 rotate-2 bg-[#FF5CAA] border-[3px] border-brutal-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Fictional</span>
            <div className="flex flex-col gap-2">
              <h2 className="font-display font-black uppercase tracking-[-0.04em] text-4xl md:text-5xl leading-[0.9]">Northwind Studio</h2>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] opacity-60">Design agency · Rotterdam · since 2017</p>
            </div>
            <p className="font-display text-base md:text-lg leading-relaxed">
              <T
                tech="A sixteen-person studio designing for software companies: brand identity, websites, design systems, product design. Retainers and fixed-price sprints, clients across Europe and North America, a client portal called Harbor. No code, no apps, no ads."
                plain="A studio of sixteen that makes logos, websites and app designs for software companies. Clients pay monthly or per project, mostly remote. They don't write code."
              />
            </p>
            <dl className="grid grid-cols-2 gap-px bg-brutal-black border-[3px] border-brutal-black">
              {[
                ["Clients", "10, from legal tech to energy"],
                ["Plans", "Starter, Studio, Partner"],
                ["Files", "Help pages to Slack threads"],
                ["Languages", "English, Dutch, German, Spanish"],
              ].map(([k, v]) => (
                <div key={k} className="bg-white px-3 py-2.5 flex flex-col gap-0.5">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] opacity-50">{k}</dt>
                  <dd className="font-display text-sm font-bold leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="font-mono text-[11px] leading-relaxed opacity-60">Not a real company. The people, the clients and the money are made up; any resemblance is an accident.</p>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] opacity-60">The team</span>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PEOPLE.map(([name, role], i) => (
              <li key={name} className="flex items-center gap-2.5 border-2 border-brutal-black bg-white px-2 py-1.5 min-w-0">
                <span className="shrink-0 w-8 h-8 flex items-center justify-center border-2 border-brutal-black font-display font-black text-xs" style={{ background: COLORS[i % COLORS.length] }}>
                  {initials(name)}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-display font-bold text-[13px] leading-tight">{name}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.06em] leading-snug opacity-60">{role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

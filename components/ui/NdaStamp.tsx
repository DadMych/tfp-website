interface NdaStampProps {
  /** light = outlined on cream · dark = filled red on black */
  tone?: "light" | "dark";
  className?: string;
}

export default function NdaStamp({ tone = "light", className = "" }: NdaStampProps) {
  // Deep red on cream and black on red both clear 4.5:1 at this size.
  const toneClass =
    tone === "dark"
      ? "bg-brutal-red border-brutal-red text-brutal-black"
      : "bg-transparent border-brutal-red text-[#B80000]";

  return (
    <span
      className={`inline-block border-[3px] px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] leading-tight -rotate-3 select-none ${toneClass} ${className}`}
      style={{ boxShadow: "2px 2px 0px 0px #000000" }}
    >
      Under NDA
    </span>
  );
}

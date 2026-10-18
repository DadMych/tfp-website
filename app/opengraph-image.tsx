import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { partHeadline } from "@/components/lab/PartProofs";
import { hero } from "@/lib/data";

export const alt = "tfpdev — Solution Architect · AI, Payments, Web3";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OpenGraphImage() {
  const [display, mono, ...live] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-Bold.woff")),
    partHeadline("ai"),
    partHeadline("money"),
    partHeadline("web3"),
  ]);
  const proof = [...live.filter((s) => s !== null), { values: ["30+"], label: "projects shipped in 8 years" }];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#FFFDF5", color: "#000", display: "flex", flexDirection: "column", padding: 64, fontFamily: "Space Grotesk" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36, fontFamily: "JetBrains Mono", fontSize: 20, letterSpacing: 2, textTransform: "uppercase" }}>
          <div style={{ display: "flex", background: "#000", color: "#FFE600", padding: "8px 16px", border: "3px solid #000" }}>tfpdev.com</div>
          <div style={{ display: "flex", background: "#FFE600", padding: "8px 16px", border: "3px solid #000" }}>{hero.eyebrow}</div>
        </div>
        <div style={{ display: "flex", fontSize: 40, lineHeight: 1, letterSpacing: -1.5, textTransform: "uppercase", color: "#00000080", marginBottom: 14 }}>{hero.lead}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, fontSize: 82, lineHeight: 0.95, letterSpacing: -4, textTransform: "uppercase" }}>
          <span>{hero.punch}</span>
          <span style={{ background: "#FFE600", padding: "0 10px" }}>{hero.mark}</span>
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", background: "#3a3a37", border: "4px solid #000", gap: 3, boxShadow: "8px 8px 0 #000" }}>
          {proof.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10, background: "#000", color: "#FFFDF5", padding: "20px 18px", fontFamily: "JetBrains Mono" }}>
              <div style={{ display: "flex", fontSize: 30, letterSpacing: -1.5, whiteSpace: "nowrap" }}>{s.values.join(" → ")}</div>
              <div style={{ display: "flex", fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", color: "#FFFDF599", lineHeight: 1.25 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: display, style: "normal", weight: 700 },
        { name: "JetBrains Mono", data: mono, style: "normal", weight: 700 },
      ],
    }
  );
}

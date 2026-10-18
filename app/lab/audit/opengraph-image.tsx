import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BAD_TOTAL } from "@/lib/audit/story";

export const alt = "Launch anyway? — Part 5. One month, €11,600 refunded or missing.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [display, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-Bold.woff")),
  ]);
  const cost = `€${BAD_TOTAL.euros.toLocaleString("en-US")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#FFFDF5", color: "#000", display: "flex", flexDirection: "column", padding: 64, fontFamily: "Space Grotesk" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ display: "flex", background: "#000", color: "#FFE600", padding: "8px 16px", fontSize: 20, fontFamily: "JetBrains Mono", letterSpacing: 2, border: "3px solid #000" }}>
            tfpdev.com/lab/audit
          </div>
          <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 20, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7 }}>
            Part 5 · Northwind gets audited
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 60, lineHeight: 0.95, letterSpacing: -3, textTransform: "uppercase", maxWidth: 1000, marginBottom: 36 }}>
          The cabinet works in the demo. Launch it?
        </div>

        <div style={{ display: "flex", background: "#FF3B3B", color: "#FFFDF5", border: "6px solid #000", boxShadow: "12px 12px 0 #000", padding: "26px 44px", fontSize: 96, letterSpacing: -2, textTransform: "uppercase", alignSelf: "flex-start" }}>
          Launch anyway
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        <div style={{ display: "flex", background: "#000", color: "#FFFDF5", border: "4px solid #000", padding: "22px 26px", fontSize: 34, letterSpacing: -1, textTransform: "uppercase", maxWidth: 1060 }}>
          One month. {cost} refunded or missing.
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

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fullCases, getCase } from "@/lib/work-data";

export const alt = "tfpdev — case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return fullCases.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug);
  const [display, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-Bold.woff")),
  ]);

  const title = c?.title ?? "Work";
  const metrics = c?.metrics ?? [];
  const titleSize = title.length > 28 ? 72 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0A",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          position: "relative",
          fontFamily: "Space Grotesk",
          color: "#FFFDF5",
        }}
      >
        {/* Grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(#ffffff12 1px, transparent 1px), linear-gradient(90deg, #ffffff12 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                background: "#FFE600",
                color: "#000",
                padding: "8px 16px",
                fontSize: 20,
                fontFamily: "JetBrains Mono",
                letterSpacing: 3,
                textTransform: "uppercase",
                border: "3px solid #000",
              }}
            >
              tfpdev.com / work
            </div>
            <div style={{ display: "flex", color: "#ffffff70", fontSize: 20, fontFamily: "JetBrains Mono", letterSpacing: 3 }}>
              CASE {c?.index ?? "—"}
            </div>
          </div>
          {c?.nda && (
            <div
              style={{
                display: "flex",
                border: "4px solid #FF0000",
                color: "#FF0000",
                padding: "6px 14px",
                fontSize: 18,
                fontFamily: "JetBrains Mono",
                letterSpacing: 4,
                textTransform: "uppercase",
                transform: "rotate(-4deg)",
              }}
            >
              Under NDA
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            lineHeight: 0.95,
            letterSpacing: -3,
            textTransform: "uppercase",
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* Metrics */}
        <div style={{ display: "flex", gap: 20 }}>
          {metrics.slice(0, 3).map((m) => (
            <div
              key={m.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
                border: "3px solid #FFFDF5",
                boxShadow: "6px 6px 0 #FFE600",
                padding: "20px 22px",
                background: "#0A0A0A",
              }}
            >
              <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 44, letterSpacing: -2 }}>{m.value}</div>
              <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 15, letterSpacing: 2, color: "#ffffff80", textTransform: "uppercase" }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 36,
            fontFamily: "JetBrains Mono",
            fontSize: 18,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#ffffff60",
          }}
        >
          <div style={{ display: "flex" }}>{c ? `${c.region} · ${c.role}` : ""}</div>
          <div style={{ display: "flex", color: "#FFE600" }}>Oleksii K.</div>
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

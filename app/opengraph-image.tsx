import { ImageResponse } from "next/og";

export const alt = "tfpdev — Fractional CTO & MVP Development";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0A",
          display: "flex",
          flexDirection: "column",
          padding: 72,
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Grid watermark */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(#ffffff10 1px, transparent 1px), linear-gradient(90deg, #ffffff10 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Yellow ticker row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#FFE600",
              color: "#000",
              padding: "8px 16px",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              border: "3px solid #000",
            }}
          >
            tfpdev.com
          </div>
          <div
            style={{
              display: "flex",
              color: "#ffffff60",
              fontSize: 18,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Fractional CTO · Based in EU
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "#FFFCEE",
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: -3,
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex" }}>CTO as a</div>
          <div style={{ display: "flex", color: "#FFE600" }}>service.</div>
        </div>

        {/* Subline — one line each, stacked */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "#ffffff90",
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.35,
            marginBottom: 60,
          }}
        >
          <div style={{ display: "flex" }}>
            8 years shipping. 30+ projects. Teams up to 18.
          </div>
          <div style={{ display: "flex" }}>
            Payments · MVP · Automation · PropTech.
          </div>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#ffffff50",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex" }}>US · EU · Based in Spain</div>
          <div style={{ display: "flex", color: "#FFE600" }}>
            → book a call
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

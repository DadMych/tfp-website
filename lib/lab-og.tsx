import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { aiArticles } from "./ai-lab";
import { moneyModules } from "./money-lab";
import { web3Chapters } from "./web3-lab";

/** Page metadata for a lab page. openGraph is replaced, not merged, so each page sets all of it. */
export function labMeta(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | tfpdev`, description, url: path, type: "article" },
    twitter: { card: "summary_large_image", title: `${title} | tfpdev`, description },
  };
}

export interface OgCard {
  path: string;
  kicker: string;
  title: string;
  line: string;
  bg: string;
  ink?: string;
}

const labs = {
  money: { name: "Money Lab", items: moneyModules },
  ai: { name: "AI Lab", items: aiArticles },
  web3: { name: "Web3 Lab", items: web3Chapters },
};

export function articleCard(lab: keyof typeof labs, slug: string): OgCard {
  const m = labs[lab].items.find((x) => x.slug === slug);
  if (!m) throw new Error(`no ${lab} article ${slug}`);
  return {
    path: `/lab/${lab}/${slug}`,
    kicker: `${labs[lab].name} · ${m.kicker}`,
    title: m.title,
    line: m.plain ?? m.proves,
    bg: m.color,
    ink: m.ink,
  };
}

export const ogSize = { width: 1200, height: 630 };

export async function labOgImage(c: OgCard) {
  const [display, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-Bold.woff")),
  ]);
  const ink = c.ink ?? "#000";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: c.bg, color: ink, display: "flex", flexDirection: "column", padding: 64, fontFamily: "Space Grotesk" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div style={{ display: "flex", background: "#000", color: "#FFE600", padding: "8px 16px", fontSize: 20, fontFamily: "JetBrains Mono", letterSpacing: 2, border: "3px solid #000" }}>
            tfpdev.com{c.path}
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, letterSpacing: 3, textTransform: "uppercase", opacity: 0.75, marginBottom: 16 }}>{c.kicker}</div>
        <div style={{ display: "flex", fontSize: c.title.length > 18 ? 84 : 104, lineHeight: 0.9, letterSpacing: -4, textTransform: "uppercase", maxWidth: 1072 }}>{c.title}</div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", background: "#FFFDF5", color: "#000", border: "4px solid #000", boxShadow: "8px 8px 0 #000", padding: "22px 26px", fontSize: 27, lineHeight: 1.3, maxWidth: 1060 }}>
          {c.line}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 26, fontFamily: "JetBrains Mono", fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>Oleksii K.</div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Space Grotesk", data: display, style: "normal", weight: 700 },
        { name: "JetBrains Mono", data: mono, style: "normal", weight: 700 },
      ],
    }
  );
}

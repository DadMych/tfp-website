import type { MetadataRoute } from "next";
import { fullCases } from "@/lib/work-data";
import { labEnabled, liveDemos } from "@/lib/lab-config";
import { liveModules } from "@/lib/money-lab";
import { liveArticles } from "@/lib/ai-lab";
import { liveChapters } from "@/lib/web3-lab";
import { liveChapters as privacyChapters } from "@/lib/privacy-lab";
import { liveChapters as auditChapters } from "@/lib/audit-lab";

const SITE_URL = "https://tfpdev.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const base: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/work`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...fullCases.map((c) => ({
      url: `${SITE_URL}/work/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/insights`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/start`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/free`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/review`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  // Lab appears only once at least one demo is live.
  if (labEnabled) {
    if (liveDemos.length > 1) {
      base.push({ url: `${SITE_URL}/lab`, lastModified: now, changeFrequency: "monthly", priority: 0.7 });
    }
    if (liveDemos.some((d) => d.slug === "ai")) {
      base.push(
        { url: `${SITE_URL}/lab/ai`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
        ...liveArticles.map((a) => ({
          url: `${SITE_URL}/lab/ai/${a.slug}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      );
    }
    if (liveDemos.some((d) => d.slug === "money")) {
      base.push(
        { url: `${SITE_URL}/lab/money`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
        ...liveModules.map((m) => ({
          url: `${SITE_URL}/lab/money/${m.slug}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      );
    }
    if (liveDemos.some((d) => d.slug === "web3")) {
      base.push(
        { url: `${SITE_URL}/lab/web3`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
        ...liveChapters.map((c) => ({
          url: `${SITE_URL}/lab/web3/${c.slug}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      );
    }
    if (liveDemos.some((d) => d.slug === "privacy")) {
      base.push(
        { url: `${SITE_URL}/lab/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
        ...privacyChapters.map((c) => ({
          url: `${SITE_URL}/lab/privacy/${c.slug}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      );
    }
    if (liveDemos.some((d) => d.slug === "audit")) {
      base.push(
        { url: `${SITE_URL}/lab/audit`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
        ...auditChapters.map((c) => ({
          url: `${SITE_URL}/lab/audit/${c.slug}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      );
    }
  }

  return base;
}

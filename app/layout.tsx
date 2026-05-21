import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { siteConfig } from "@/lib/data";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const SITE_URL = "https://tfpdev.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "tfpdev — Fractional CTO & MVP Development",
    template: "%s | tfpdev",
  },
  description:
    "Fractional CTO for founders who need someone reliable — not the smartest engineer, the one who ships on schedule and doesn't disappear. 8 years, 30+ projects. Fintech, payments, MVP. 1 slot · Q2/Q3 2026.",
  applicationName: "tfpdev",
  authors: [{ name: "Oleksii K.", url: siteConfig.linkedinUrl }],
  creator: "Oleksii K.",
  publisher: "tfpdev",
  keywords: [
    "fractional cto",
    "cto as a service",
    "fractional cto for startups",
    "hire fractional cto europe",
    "mvp development",
    "mvp development agency",
    "next.js developer for startup",
    "telegram bot developer",
    "stripe integration developer",
    "payment gateway integration",
    "real estate crm developer",
    "proptech developer",
    "fractional technical leader",
    "technical co-founder as a service",
  ],
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "tfpdev",
    title: "tfpdev — Fractional CTO & MVP Development",
    description:
      "8 years of shipping. 30+ projects. Teams up to 18. Payment systems, MVP, automation, PropTech. For startups that need technical leadership without a $300k hire.",
  },
  twitter: {
    card: "summary_large_image",
    title: "tfpdev — Fractional CTO & MVP Development",
    description:
      "Fractional CTO & full-stack development for startups. 8 years shipping, 30+ projects, teams up to 18.",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/icon",
    shortcut: "/favicon.ico",
  },
  // Add values below once you have them from Search Console / Yandex / Bing
  // verification: {
  //   google: "google-site-verification-token",
  //   yandex: "yandex-verification-token",
  //   other: { "msvalidate.01": "bing-verification-token" },
  // },
};

// ── Structured data (JSON-LD) ────────────────────────────────────────────────
// Describes the business + person so Google / LLM crawlers understand what this
// site is. Rendered inline in <head> — tiny payload, huge SEO value.

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#business`,
      name: "tfpdev",
      description:
        "Fractional CTO and full-stack development services for startups. MVP development, payment systems, bots & automation, PropTech, DevOps.",
      url: SITE_URL,
      email: "oleksii@tfpdev.com",
      image: `${SITE_URL}/opengraph-image`,
      logo: `${SITE_URL}/icon`,
      priceRange: "$$$",
      areaServed: [
        { "@type": "Country", name: "United States" },
        { "@type": "Place", name: "European Union" },
        { "@type": "Country", name: "Ukraine" },
      ],
      serviceType: [
        "Fractional CTO",
        "MVP Development",
        "Payment Integration",
        "Telegram Bot Development",
        "Real Estate Tech",
        "DevOps & Infrastructure",
      ],
      founder: { "@id": `${SITE_URL}/#person` },
      makesOffer: [
        {
          "@type": "Offer",
          name: "CTO as a Service",
          description:
            "Fractional technical leadership — architecture, hiring, delivery, tech due diligence.",
        },
        {
          "@type": "Offer",
          name: "MVP & Product Development",
          description:
            "Production-ready MVP in 8–12 weeks. Full-stack, auth, payments, admin, deployment.",
        },
        {
          "@type": "Offer",
          name: "Payment Systems & Fintech",
          description:
            "Stripe, crypto, subscription billing, marketplace payouts, KYC/AML.",
        },
      ],
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Oleksii K.",
      jobTitle: "Fractional CTO",
      url: SITE_URL,
      email: "oleksii@tfpdev.com",
      sameAs: [siteConfig.linkedinUrl],
      worksFor: { "@id": `${SITE_URL}/#business` },
      knowsAbout: [
        "Software Architecture",
        "Payment Systems",
        "MVP Development",
        "Team Leadership",
        "DevOps",
        "Fintech",
        "PropTech",
        "Next.js",
        "TypeScript",
        "Python",
        "Telegram Bot API",
        "Stripe",
      ],
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "Igor Sikorsky Kyiv Polytechnic Institute",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "tfpdev",
      publisher: { "@id": `${SITE_URL}/#business` },
      inLanguage: "en-US",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link
          href="https://assets.calendly.com/assets/external/widget.css"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          // JSON-LD in <head> is the officially recommended way to ship
          // structured data in an App Router app.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-cream text-brutal-black antialiased">
        {children}

        <Script
          src="https://assets.calendly.com/assets/external/widget.js"
          strategy="lazyOnload"
        />

        {/* Analytics placeholder — replace with Plausible or GA snippet */}
        {/* <Script src="https://plausible.io/js/script.js" data-domain="tfpdev.com" strategy="afterInteractive" /> */}
      </body>
    </html>
  );
}

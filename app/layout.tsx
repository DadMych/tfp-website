import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import CalendlyAssets from "@/components/CalendlyAssets";
import { offers, siteConfig } from "@/lib/data";
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
const TITLE = "tfpdev — Solution Architect · AI, Payments, Web3";
const DESCRIPTION =
  "I design and build the parts of a product where one mistake costs money or trust. Live demos of how they break, and the version that holds.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | tfpdev",
  },
  description: DESCRIPTION,
  applicationName: "tfpdev",
  authors: [{ name: "Oleksii K.", url: siteConfig.linkedinUrl }],
  creator: "Oleksii K.",
  publisher: "tfpdev",
  keywords: [
    "solution architect",
    "mvp development",
    "mvp development agency",
    "next.js developer for startup",
    "telegram bot developer",
    "stripe integration developer",
    "payment gateway integration",
    "real estate crm developer",
    "proptech developer",
  ],
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "tfpdev",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
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
      description: DESCRIPTION,
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
        "Solution Architecture",
        "Software Audit",
        "MVP Development",
        "Payment Integration",
        "Telegram Bot Development",
        "Real Estate Tech",
        "DevOps & Infrastructure",
      ],
      founder: { "@id": `${SITE_URL}/#person` },
      makesOffer: offers.map((o) => ({
        "@type": "Offer",
        name: o.name,
        description: `${o.terms}. ${o.youGet}`,
      })),
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Oleksii K.",
      jobTitle: "Solution Architect",
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
        <script
          type="application/ld+json"
          // JSON-LD in <head> is the officially recommended way to ship
          // structured data in an App Router app.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-cream text-brutal-black antialiased">
        {children}

        <CalendlyAssets />

        {/* Analytics placeholder — replace with Plausible or GA snippet */}
        {/* <Script src="https://plausible.io/js/script.js" data-domain="tfpdev.com" strategy="afterInteractive" /> */}
      </body>
    </html>
  );
}

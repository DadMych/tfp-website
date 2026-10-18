import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights — Real decisions from real projects",
  description:
    "25 technical and business decisions from building a real platform with a team of 18. Architecture, payments, team process, product strategy, and hard lessons. No theory — just outcomes.",
  openGraph: {
    title: "Insights — Real decisions from real projects | tfpdev",
    description:
      "25 technical and business decisions from building a real platform with a team of 18. No theory — just what we chose, why, and what happened.",
    url: "https://tfpdev.com/insights",
    siteName: "tfpdev",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Insights — Real decisions from real projects | tfpdev",
    description:
      "25 decisions from a real 18-person platform build. Architecture, payments, team, product, devops, hard lessons.",
  },
  alternates: {
    canonical: "https://tfpdev.com/insights",
  },
};

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start a Project | tfpdev",
  description:
    "Take a 60-second quiz to find out what technical help you need. Then tell me about your project. No pitch decks, no sales calls — just a real conversation about your business problem.",
  openGraph: {
    title: "Start a Project | tfpdev",
    description:
      "Take a 60-second quiz to find out what technical help you need. No pitch decks, no sales calls — just a real conversation.",
    url: "https://tfpdev.com/start",
    siteName: "tfpdev",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start a Project | tfpdev",
    description:
      "60-second quiz. Personalized recommendation. Then tell me about your project.",
  },
  alternates: {
    canonical: "https://tfpdev.com/start",
  },
};

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

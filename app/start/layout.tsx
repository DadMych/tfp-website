import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start a Project",
  description:
    "Three ways to work with me — audit, build, or stay on. Then tell me about your project. No pitch decks, no sales calls — just a real conversation about your business problem.",
  openGraph: {
    title: "Start a Project | tfpdev",
    description:
      "Three ways to work with me — audit, build, or stay on. Then tell me about your project. No pitch decks, no sales calls.",
    url: "https://tfpdev.com/start",
    siteName: "tfpdev",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start a Project | tfpdev",
    description:
      "Audit, build, or stay on. Then tell me about your project.",
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

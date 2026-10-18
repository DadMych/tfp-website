import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.200"],
  // Statically export all pages — zero serverless functions needed on Vercel
  // output: "export",  // Uncomment if you want pure static export (disables /icon route)

  // Compress output
  compress: true,

  // Remove X-Powered-By header
  poweredByHeader: false,

  // Image optimization (using next/image if needed in future)
  images: {
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      { source: "/lab/ai/half-written-calls", destination: "/lab/ai/agents-that-act", permanent: true },
      { source: "/lab/money/articles", destination: "/lab/money", permanent: true },
      { source: "/lab/money/games", destination: "/lab/money#games", permanent: true },
    ];
  },
};

export default nextConfig;

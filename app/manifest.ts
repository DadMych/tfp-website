import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tfpdev",
    short_name: "tfpdev",
    description:
      "Solution Architect — audits, MVPs and rescue work for the parts of a product where one mistake costs money or trust.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDF5",
    theme_color: "#FFFDF5",
    icons: [
      { src: "/logo-icon.png", sizes: "any", type: "image/png" },
      { src: "/logo-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

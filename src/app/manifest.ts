import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flight Lyceum",
    short_name: "Flight Lyceum",
    description:
      "EASA compliance and training platform for Approved Training Organisations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1f3434",
    theme_color: "#1f3434",
    categories: ["business", "education", "productivity"],
    lang: "en-GB",
    icons: [
      {
        src: "/images/mobile-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/mobile-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

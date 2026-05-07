import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flight Lyceum",
    short_name: "Flight Lyceum",
    description:
      "Training and compliance platform for Approved Training Organisations.",
    start_url: "/",
    display: "standalone",
    background_color: "#21364b",
    theme_color: "#21364b",
    icons: [
      {
        src: "/images/mobile-icon.png",
        sizes: "377x377",
        type: "image/png",
      },
    ],
  };
}

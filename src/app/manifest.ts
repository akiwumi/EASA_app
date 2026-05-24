import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flight Lyceum",
    short_name: "Flight Lyceum",
    description:
      "EASA compliance and training platform for Approved Training Organisations.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1f3434",
    theme_color: "#1f3434",
    categories: ["business", "education", "productivity"],
    lang: "en-GB",
    icons: [
      {
        src: "/images/flight-lyceum-logo.png",
        sizes: "968x514",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/flight-lyceum-logo.png",
        sizes: "968x514",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Go to your compliance dashboard",
        url: "/dashboard",
      },
      {
        name: "Review Queue",
        short_name: "Review",
        description: "Open your regulation review queue",
        url: "/updates",
      },
      {
        name: "Flight Books",
        short_name: "Books",
        description: "Browse your uploaded manuals",
        url: "/flightbooks",
      },
      {
        name: "Training",
        short_name: "Training",
        description: "Manage training programmes",
        url: "/training/programmes",
      },
    ],
    screenshots: [
      {
        src: "/images/dashboard-overview.jpg",
        sizes: "1280x800",
        type: "image/jpeg",
        // @ts-expect-error — form_factor is valid per spec but not yet in Next.js types
        form_factor: "wide",
        label: "Compliance dashboard",
      },
      {
        src: "/images/mobile-student-view.jpg",
        sizes: "390x844",
        type: "image/jpeg",
        // @ts-expect-error
        form_factor: "narrow",
        label: "Student reading view on mobile",
      },
    ],
  };
}

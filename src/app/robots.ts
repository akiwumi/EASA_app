import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://flightlyceum.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/search/",
          "/results/",
          "/updates/",
          "/changes/",
          "/history/",
          "/notifications/",
          "/profile/",
          "/settings/",
          "/training/",
          "/flightbooks/",
          "/api/",
          "/subscription-locked/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

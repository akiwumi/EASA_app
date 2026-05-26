import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://flightlyceum.com";

export const metadata: Metadata = {
  alternates: {
    canonical: siteUrl,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Flight Lyceum",
  url: siteUrl,
  logo: `${siteUrl}/images/flight-lyceum-logo.png`,
  description:
    "The compliance and training platform built for EASA Approved Training Organisations.",
  sameAs: [],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Flight Lyceum",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: siteUrl,
  description:
    "EASA compliance and training management platform for Approved Training Organisations. Monitor regulation changes, control manuals, assign reading by lesson, and track acknowledgements.",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "EUR",
    lowPrice: "199",
    offerCount: "3",
  },
  featureList: [
    "EASA regulation change monitoring",
    "Controlled manuals with revision history",
    "Read-and-acknowledge workflows",
    "Lesson-linked reading assignments",
    "AI-assisted impact assessment",
    "Audit-ready reporting",
    "Mobile-first student access",
  ],
  audience: {
    "@type": "Audience",
    audienceType: "Approved Training Organisations, Flight Schools, ATOs",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Flight Lyceum",
  url: siteUrl,
  description:
    "Compliance and training platform for EASA Approved Training Organisations.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <LandingPage />
    </>
  );
}

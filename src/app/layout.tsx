import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Instrument_Serif, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import PullToRefresh from "@/components/PullToRefresh";
import CookieBanner from "@/components/CookieBanner";
import PwaWrapper from "@/components/PwaWrapper";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-serif",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jb-mono",
  weight: ["300", "400", "500"],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://flightlyceum.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Flight Lyceum: Compliance & Training Platform for Flight Schools",
    template: "%s | Flight Lyceum",
  },
  description:
    "The compliance and training platform built for EASA Approved Training Organisations. Monitor regulation changes, control your manuals, assign reading by lesson, and track every acknowledgement.",
  keywords: [
    "EASA compliance software",
    "flight school training management",
    "ATO compliance platform",
    "approved training organisation software",
    "aviation training management system",
    "EASA regulation tracking",
    "flight school manual management",
    "aviation compliance software",
    "flight school management system",
    "EASA ATO software",
  ],
  authors: [{ name: "Flight Lyceum" }],
  creator: "Flight Lyceum",
  publisher: "Flight Lyceum",
  other: { google: "notranslate" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: "Flight Lyceum",
    title: "Flight Lyceum:Compliance & Training Platform for Flight Schools",
    description:
      "The compliance and training platform built for EASA Approved Training Organisations. Monitor regulation changes, control your manuals, assign reading by lesson, and track every acknowledgement.",
    images: [
      {
        url: "/images/hero-cessna.jpg",
        width: 1200,
        height: 630,
        alt: "Flight Lyceum:EASA compliance and training platform for ATOs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Lyceum:Compliance & Training Platform for Flight Schools",
    description:
      "Monitor EASA changes, control your manuals, assign reading by lesson, and track every acknowledgement in one system your whole school actually uses.",
    images: ["/images/hero-cessna.jpg"],
  },
  alternates: {
    canonical: siteUrl,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/images/flight-lyceum-logo.png",
    icon: [
      { url: "/images/flight-lyceum-logo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flight Lyceum",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f3434",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className={`${dmSerifDisplay.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col easa-app">
        <PullToRefresh />
        {children}
        <CookieBanner />
        <PwaWrapper />
      </body>
    </html>
  );
}

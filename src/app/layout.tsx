import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/env";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Spooldex Tracker",
    template: "%s | Spooldex Tracker",
  },
  description:
    "Open filament price tracking for Germany. Compare current offers, track freshness, and discover where to buy popular 3D printing materials.",
  openGraph: {
    type: "website",
    siteName: "Spooldex Tracker",
    title: "Spooldex Tracker",
    description:
      "Open filament price tracking for Germany. Compare current offers, track freshness, and discover where to buy popular 3D printing materials.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spooldex Tracker",
    description:
      "Open filament price tracking for Germany. Compare current offers, track freshness, and discover where to buy popular 3D printing materials.",
  },
};

export const viewport: Viewport = {
  themeColor: "#c76c2d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${fraunces.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/env";

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
  themeColor: "#0C857A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}

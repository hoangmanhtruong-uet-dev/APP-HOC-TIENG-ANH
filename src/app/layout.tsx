import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CrispProvider } from "@/components/shared/crisp-provider";
import { siteConfig } from "@/config/site";
import { OfflineFallbackRegistration } from "@/components/shared/offline-fallback-registration";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Học IELTS có lộ trình`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3568d4",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={GeistSans.variable}
      data-scroll-behavior="smooth"
    >
      <body>
        {children}
        <OfflineFallbackRegistration />
        <CrispProvider />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

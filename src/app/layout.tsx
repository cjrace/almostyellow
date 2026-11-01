import "@mantine/core/styles.css";
import { ColorSchemeScript, AppShell, Anchor } from "@mantine/core";
import ThemeProvider from "@/components/themeprovider";
import "@/styles/global.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import skip from "@/styles/skip.module.css";
import { siteUrl } from "@/routes";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | Almost Yellow",
    default: "Almost Yellow",
  },
  description: "Our website of games, cocktails and the good stuff.",
  // Each page's own URL, so search engines ignore any query string
  alternates: { canonical: "./" },
  openGraph: {
    title: "Almost Yellow",
    description: "Our website of games, cocktails and the good stuff.",
    type: "website",
    siteName: "Almost Yellow",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { title: "Almost Yellow" },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
};

// The browser bar matches Mantine's page background in each scheme
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#242424" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <ThemeProvider>
          <AppShell
            header={{ height: { base: 60, md: 70, lg: 80 } }}
            padding="md"
          >
            <Anchor href="#main-content" className={skip.skiplink}>
              Skip to main content
            </Anchor>
            {children}
          </AppShell>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}

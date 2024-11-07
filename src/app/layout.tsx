import "@mantine/core/styles.css";
import { MantineProvider, ColorSchemeScript, AppShell } from "@mantine/core";
import { acalat } from "@/styles/acalat";
import "@/styles/global.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    template: "%s | Almost Yellow",
    default: "Almost Yellow",
  },
  description: "Our website of games, cocktails and the good stuff.",
  openGraph: {
    title: "Almost Yellow",
    description: "Our website of games, cocktails and the good stuff.",
    type: "website",
    url: "https://www.almostyellow.co.uk",
    siteName: "Almost Yellow",
  },
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
        <MantineProvider defaultColorScheme="dark" theme={acalat}>
          <AppShell
            header={{ height: { base: 60, md: 70, lg: 80 } }}
            padding="md"
          >
            {children}
          </AppShell>
          <Analytics />
          <SpeedInsights />
        </MantineProvider>
      </body>
    </html>
  );
}

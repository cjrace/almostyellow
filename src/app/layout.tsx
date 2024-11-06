import "@mantine/core/styles.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import { acalat } from "@/styles/acalat";
import "@/styles/global.css";
import type { Metadata } from "next";
import ToggleColour from "@/components/togglecolour";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const dynamic = "force-dynamic";

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
          <ToggleColour />
          {children}
          <Analytics />
          <SpeedInsights />
        </MantineProvider>
      </body>
    </html>
  );
}

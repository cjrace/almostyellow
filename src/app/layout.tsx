import "@mantine/core/styles.css";
import {
  MantineProvider,
  ColorSchemeScript,
  AppShell,
  Anchor,
} from "@mantine/core";
import { acalat } from "@/styles/acalat";
import "@/styles/global.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import skip from "@/styles/skip.module.css";

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
        <meta name="apple-mobile-web-app-title" content="Almost Yellow" />
        <ColorSchemeScript defaultColorScheme="dark" />
        <Script
          async
          data-trigger="custom"
          src="https://run.confettipage.com/here.js"
          data-confetticode="U2FsdGVkX1+CNcJBzcKLJOKIu6YhgT7XjghTb+IWZHSoogELCwoPC/PUZQIW5u3G1VPa5AP+lxJTvkyENTZzRSJPTJJjB+0knZVwSPBUprdUZugMFu7o+b3Qvrt+TXJfl4nEnE86Hd2i4D/bFcHE8GHx/ZETOTUJKXBV88gGyUzWrijXvtrbArWtm1at4XdI/peCfOf+3SdC05Esnhb9gC1UVA74FF4Yjn6mHdEFuEGstzuTibqvVRG3n0J9cbj6/euOgd0566CT59EhfLGcBudSqal7p2d4Dwgt3tOU6KLv/+sBWg0gwc8dDl+2nTTmJoE6U/sL/3Qn1EmiHOvQ1dY1dhHItHHcizSsG6+IRX0SRvZ6X6e9qonsFF9IMWmeMDrtEG9tUwV0//GsBuqp13oNETU36j6ep7ZiK+9M6uJfQqsZegVdvzpPyllQ+5wwWDenjR27jowVP1pWGgHcK5O99xHBYGoqm+xWiX0LaXZ9fhmrGbYw0kVS2SpbvyjBDn3MKxc5N/p5B7Jv2lx9B94xVsiAU0P3GXCxqoFncFDI63txMjvQ9+2uFEApqXuyS2UYDH1ltKAbubpcia/A7Z3wos5QoomZjI8GK3YCrvBjHRV7/Q6cL0CqBMoeOPaMIWNH83nEOYEz1c8pPCF7Oii/Dn8+4yTebsWPpS4YAlSA7pcneoaEhntjFJm8IjHV"
        ></Script>
        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark" theme={acalat}>
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
        </MantineProvider>
      </body>
    </html>
  );
}

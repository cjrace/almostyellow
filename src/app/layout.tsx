import { MantineProvider } from "@mantine/core";
import { acalat } from "@/styles/acalat";
import "@mantine/core/styles.css";
import "@/styles/global.css";
import type { Metadata } from "next";

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

// Colour scheme toggle icons and imports
// import { ActionIcon, MantineProvider, useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
// import { IconSun, IconMoon } from "@tabler/icons-react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Colour scheme toggle
  //const { setColorScheme } = useMantineColorScheme();
  //const computedColorScheme = useComputedColorScheme('light');
  //const toggleColorScheme = () => {
  //  setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  //};

  // This our previous colour scheme toggle
  // <ActionIcon
  // onClick={() => toggleColorScheme()}
  // variant="default"
  // size="xl"
  // aria-label="Toggle color scheme"
  // >
  // <IconSun stroke={1.5} />
  // <IconMoon stroke={1.5} />
  // </ActionIcon>

  return (
    <html lang="en">
      <body>
        <MantineProvider defaultColorScheme="dark" theme={acalat}>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}

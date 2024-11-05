import { AppProps } from "next/app";
import Head from "next/head";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { acalat } from "@/styles/acalat";
import "@/styles/global.css";

// Colour scheme toggle icons and imports
// import { ActionIcon, MantineProvider, useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
// import { IconSun, IconMoon } from "@tabler/icons-react";

function MyApp({ Component, pageProps }: AppProps) {
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
    <MantineProvider defaultColorScheme="dark" theme={acalat}>
      <Head>
        {"General metadata"}
        <title>Almost yellow</title>
        <meta
          name="description"
          content="Our website of games, cocktails and the good stuff."
        />

        {"Favicons"}
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
        <meta name="apple-mobile-web-app-title" content="AlmostYellow" />
        <link rel="manifest" href="/site.webmanifest" />

        {"Add more here..."}
      </Head>

      <Component {...pageProps} />
    </MantineProvider>
  );
}

export default MyApp;

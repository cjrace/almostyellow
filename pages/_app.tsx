import { AppProps } from "next/app";
import Head from "next/head";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "../app/global.css";
import { acalat } from "../app/acalat";

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
        <title>Almost yellow</title>
        <meta
          name="description"
          content="Our website of games, cocktails and the good stuff."
        />
      </Head>

      <Component {...pageProps} />
    </MantineProvider>
  );
}

export default MyApp;

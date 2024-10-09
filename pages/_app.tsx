import { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { MantineProvider, useMantineColorScheme } from "@mantine/core";
import { theme } from "../theme";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle";
import "@mantine/core/styles.css";
import React from "react";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme}>
      <ColorSchemeToggle />

      <Head>
        <title>Almost yellow</title>
      </Head>

      <Component {...pageProps} />
    </MantineProvider>
  );
}

export default MyApp;

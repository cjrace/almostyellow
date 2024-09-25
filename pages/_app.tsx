import { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { theme } from "../theme";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle";
import React from "react";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme}>
      <ColorSchemeToggle />

      <Head>
        <title>Almost yellow</title>
      </Head>

      <Script
        src="https://www.clarity.ms/tag/o05b82hwae"
        type="text/javascript"
      />

      <Component {...pageProps} />
    </MantineProvider>
  );
}

export default MyApp;

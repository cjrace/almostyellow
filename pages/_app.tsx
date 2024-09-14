import "../app/globals.css";
import Head from "next/head";
import { AppProps } from "next/app";
import React from "react";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import MicrosoftClarity from "../components/MicrosoftClarity";

const toggleDarkMode = () => {
  document.body.classList.toggle("dark-mode");
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <MicrosoftClarity />
        <title>Almost yellow</title>
      </Head>

      <MantineProvider>
        <button onClick={toggleDarkMode}>Toggle Dark Mode</button>

        <Component {...pageProps} />
      </MantineProvider>
    </>
  );
}

export default MyApp;

import '../app/globals.css';
import Head from 'next/head';
import { AppProps } from 'next/app';
import Script from 'next/script'
import React from 'react';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Almost yellow</title>
      </Head>

      <Script src="https://www.clarity.ms/tag/o05b82hwae" type="text/javascript"/>

      <MantineProvider>
      <button onClick={toggleDarkMode}>Toggle Dark Mode</button>

      <Component {...pageProps} />
      </MantineProvider>

    </>
  );
}

export default MyApp;

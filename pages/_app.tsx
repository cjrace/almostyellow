import '../app/globals.css';
import Head from 'next/head';
import { AppProps } from 'next/app';
import React from 'react';

const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Almost yellow</title>
        <script
          async
          src="https://www.clarity.ms/tag/o05b82hwae"
          type="text/javascript"
        />
      </Head>

      <button onClick={toggleDarkMode}>Toggle Dark Mode</button>

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;

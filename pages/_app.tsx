import '../app/globals.css';
import Head from 'next/head';
import { AppProps } from 'next/app';
import React, { useEffect } from 'react';

const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');
};

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${process.env.NEXT_PUBLIC_CLARITY_ID}`;
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <Head>
        <title>Almost yellow</title>
      </Head>

      <button onClick={toggleDarkMode}>Toggle Dark Mode</button>
      
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;

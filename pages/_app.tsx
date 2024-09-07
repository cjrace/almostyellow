import '../app/globals.css';
import Head from 'next/head'
import { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Almost yellow</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp;

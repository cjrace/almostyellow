import '../app/globals.css';
import { AppProps } from 'next/app';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Almost yellow',
  description: 'A work in progress',
};

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;

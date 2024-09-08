import '../app/globals.css';
import Head from 'next/head';
import { AppProps } from 'next/app';

const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Almost yellow</title>
      </Head>

      <button onClick={toggleDarkMode}>Toggle Dark Mode</button>
      
      <Component {...pageProps} />
    </>
  )
}

export default MyApp;

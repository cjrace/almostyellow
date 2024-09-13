import styles from '../app/page.module.css';
import Image from "next/image";
import Link from 'next/link';

export default function Home() {
  return (
    <div className={styles.page}
    >
      <main className={styles.main}>
        <h1>Almost yellow</h1>
        <p>This is our homepage, we should make it prettier.</p>

        <script 
        data-trigger="custom"
        src="https://run.confettipage.com/here.js" 
        data-confetticode="U2FsdGVkX1+CNcJBzcKLJOKIu6YhgT7XjghTb+IWZHSoogELCwoPC/PUZQIW5u3G1VPa5AP+lxJTvkyENTZzRSJPTJJjB+0knZVwSPBUprdUZugMFu7o+b3Qvrt+TXJfl4nEnE86Hd2i4D/bFcHE8GHx/ZETOTUJKXBV88gGyUzWrijXvtrbArWtm1at4XdI/peCfOf+3SdC05Esnhb9gC1UVA74FF4Yjn6mHdEFuEGstzuTibqvVRG3n0J9cbj6/euOgd0566CT59EhfLGcBudSqal7p2d4Dwgt3tOU6KLv/+sBWg0gwc8dDl+2nTTmJoE6U/sL/3Qn1EmiHOvQ1dY1dhHItHHcizSsG6+IRX0SRvZ6X6e9qonsFF9IMWmeMDrtEG9tUwV0//GsBuqp13oNETU36j6ep7ZiK+9M6uJfQqsZegVdvzpPyllQ+5wwWDenjR27jowVP1pWGgHcK5O99xHBYGoqm+xWiX0LaXZ9fhmrGbYw0kVS2SpbvyjBDn3MKxc5N/p5B7Jv2lx9B94xVsiAU0P3GXCxqoFncFDI63txMjvQ9+2uFEApqXuyS2UYDH1ltKAbubpcia/A7Z3wos5QoomZjI8GK3YCrvBjHRV7/Q6cL0CqBMoeOPaMIWNH83nEOYEz1c8pPCF7Oii/Dn8+4yTebsWPpS4YAlSA7pcneoaEhntjFJm8IjHV"> async </script>

        <button onClick ={ () => window.ConfettiPage.play()}> Play confetti!</button>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/games">View our games</Link>
          <Link className={styles.primary} href="/">View our recipes</Link>
          <Link className={styles.primary} href="/cocktails">Cocktail time!</Link>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://github.com/cjrace/almostyellow"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/icons/github-mark-white.png"
            alt="GitHub icon"
            width={16}
            height={16}
          />
          GitHub
        </a>
        <div className={styles.ctas}>
          <Link className={styles.secondary} href="/admin">Admin area</Link>
        </div>
      </footer>

    </div>
  );
}

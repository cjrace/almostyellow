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
        <div className={styles.ctas}>
          <Link className={styles.primary} href="/games">View our games</Link>
          <Link className={styles.primary} href="/decisionmaker">Random decision maker</Link>
          <Link className={styles.primary} href="/recipes">Our recipes</Link>
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

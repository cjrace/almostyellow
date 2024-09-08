import styles from '../app/page.module.css';
import Link from 'next/link';

const GamesPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Our games</h1>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/games/irishbingo">Irish bingo</Link>
          <Link className={styles.primary} href="/games/uno">Uno</Link>
          <Link className={styles.primary} href="/games">???</Link>
        </div>

        <div className={styles.ctas}>
          <Link href="/" className={styles.secondary}>Back to homepage</Link>
        </div>

      </main>
    </div>
  );
};

export default GamesPage;

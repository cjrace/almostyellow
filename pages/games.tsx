import styles from '../app/page.module.css';
import Link from 'next/link';

const GamesPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Games Page</h1>
        <p>Some content here, likely related to Irish Bingo...</p>
        <div className={styles.ctas}>
          <Link href="/" className={styles.secondary}>
            Back to homepage
          </Link>
        </div>
      </main>
    </div>
  );
};

export default GamesPage;

import styles from '../app/page.module.css';
import Link from 'next/link';

const GamesPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Our games</h1>
        <div className="panel-row">
          <Link href="/games/irishbingo" className="panel">
            Irish bingo
          </Link>
          <Link href="/games/uno" className="panel">
            Uno
          </Link>
          <Link href="" className="panel">
            ???
          </Link>
        </div>
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

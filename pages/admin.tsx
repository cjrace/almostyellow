import styles from '../app/page.module.css';
import Link from 'next/link';

const AdminPage = () => {
  return (
    <div className={styles.page}>

      <main className={styles.main}>
        <h1>Welcome to our admin page</h1>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/admin/chopinliszt">Chopin Liszt</Link>
          <Link className={styles.primary} href="/admin">???</Link>
          <Link className={styles.primary} href="/admin">???</Link>
        </div>

        <div className={styles.ctas}>
          <Link href="/" className={styles.secondary}>Back to homepage</Link>
        </div>

      </main>
    </div>
  );
};

export default AdminPage;

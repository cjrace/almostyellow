import styles from "../../app/page.module.css";
import Link from "next/link";

const unoPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Uno</h1>
        <p>Under construction...</p>

        <div className={styles.ctas}>
          <Link href="/games" className={styles.secondary}>
            Back to games
          </Link>
        </div>
      </main>
    </div>
  );
};

export default unoPage;

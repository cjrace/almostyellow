import styles from "../app/page.module.css";
import Link from "next/link";
import { Button } from "@mantine/core";

const GamesPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Our games</h1>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/games/irishbingo">
            Irish bingo
          </Link>
          <Link className={styles.primary} href="/games/uno">
            Uno
          </Link>
          <Link className={styles.primary} href="/games">
            ???
          </Link>
        </div>

        <Button leftSection="🏠" variant="default" component="a" href="/">
          Back to homepage
        </Button>
      </main>
    </div>
  );
};

export default GamesPage;

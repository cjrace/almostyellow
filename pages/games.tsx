import styles from "../app/page.module.css";
import Link from "next/link";
import { Button, Breadcrumbs, Anchor } from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const GamesPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Breadcrumbs>{crumbitems}</Breadcrumbs>

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

import styles from "../../app/page.module.css";
import { Breadcrumbs, Anchor } from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Uno", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const unoPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Breadcrumbs>{crumbitems}</Breadcrumbs>
        <h1>Uno</h1>
        <p>Under construction...</p>
      </main>
    </div>
  );
};

export default unoPage;

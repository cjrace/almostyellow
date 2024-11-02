import Link from "next/link";
import { Breadcrumbs, Anchor } from "@mantine/core";
import styles from "../app/page.module.css";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const AdminPage = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Breadcrumbs>{crumbitems}</Breadcrumbs>

        <h1>Welcome to our admin page</h1>

        <div>
          <Link href="/admin/chopinliszt">Chopin Liszt</Link>
          <Link href="/admin">???</Link>
          <Link href="/admin">???</Link>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;

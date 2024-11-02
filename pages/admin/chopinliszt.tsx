import React from "react";
import styles from "../../app/page.module.css";
import Checklist from "../../components/checklist";
import { Button, Breadcrumbs, Anchor } from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Chopin Liszt", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const ChopinLiszt: React.FC = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Breadcrumbs>{crumbitems}</Breadcrumbs>

        <h1>Our Chopin Liszt</h1>
        <Checklist />

        <Button leftSection="🏠" variant="default" component="a" href="/admin">
          Back to admin page
        </Button>
      </main>
    </div>
  );
};

export default ChopinLiszt;

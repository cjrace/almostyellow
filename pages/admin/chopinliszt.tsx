import React from "react";
import styles from "../../app/page.module.css";
import Checklist from "../../components/checklist";
import { Breadcrumbs, Anchor } from "@mantine/core";

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
      </main>
    </div>
  );
};

export default ChopinLiszt;

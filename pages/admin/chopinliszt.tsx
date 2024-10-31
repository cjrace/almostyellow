import React from "react";
import Link from "next/link";
import styles from "../../app/page.module.css";
import Checklist from "../../components/checklist";
import { Button } from "@mantine/core";

const ChopinLiszt: React.FC = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
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

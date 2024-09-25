import React from "react";
import Link from "next/link";
import styles from "../../app/page.module.css";
import Checklist from "../../components/checklist";

const ChopinLiszt: React.FC = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Our Chopin Liszt</h1>
        <Checklist />

        <div className={styles.ctas}>
          <Link href="/admin" className={styles.secondary}>
            Back to admin page
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ChopinLiszt;

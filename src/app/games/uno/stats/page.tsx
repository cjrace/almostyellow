import type { Metadata } from "next";
import Header from "@/components/header";
import UnoStatistics from "@/components/unostatistics";
export const metadata: Metadata = { title: "Uno statistics" };
export default function UnoStatsPage() {
  return (
    <>
      <Header noCrumbs game />
      <main id="main-content">
        <UnoStatistics />
      </main>
    </>
  );
}

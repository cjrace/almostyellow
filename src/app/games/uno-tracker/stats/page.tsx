import type { Metadata } from "next";
import Header from "@/components/header";
import UnoStatistics from "@/components/unostatistics";
export const metadata: Metadata = { title: "Uno tracker statistics" };
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

import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import UnoStatistics from "@/components/unostatistics";
export const metadata = pageMetadata(
  "Uno tracker statistics",
  "Compare Uno wins, scores and player statistics across completed games.",
);
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

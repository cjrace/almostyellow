import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import UnoStatistics from "@/components/unostatistics";
export const metadata = pageMetadata(
  "Uno tracker statistics",
  "See who the Uno gods have favoured in Cam and Laura's rivalry.",
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

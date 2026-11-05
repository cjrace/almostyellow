import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import UnoStatistics from "@/components/unostatistics";
export const metadata = pageMetadata(
  "Uno tracker statistics",
  "Who's winning Cam and Laura's Uno rivalry? Let the numbers settle it.",
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

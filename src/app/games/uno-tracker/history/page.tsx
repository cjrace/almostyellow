import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import UnoHistory from "@/components/unohistory";

export const metadata = pageMetadata(
  "Uno game history",
  "Browse completed Uno games and review the scores from each round.",
);
export default function UnoHistoryPage() {
  return (
    <>
      <Header noCrumbs game />
      <main id="main-content">
        <UnoHistory />
      </main>
    </>
  );
}

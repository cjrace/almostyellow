import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import UnoHistory from "@/components/unohistory";

export const metadata = pageMetadata(
  "Uno game history",
  "Revisit Cam and Laura's Uno battles. Bragging rights are on the line.",
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

import type { Metadata } from "next";
import Header from "@/components/header";
import UnoHistory from "@/components/unohistory";

export const metadata: Metadata = { title: "Uno game history" };
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

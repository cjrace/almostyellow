import type { Metadata } from "next";
import Header from "@/components/header";
import UnoTracker from "@/components/unotracker";

export const metadata: Metadata = { title: "Uno tracker" };
export default function UnoPage() {
  return (
    <>
      <Header noCrumbs game />
      <main id="main-content">
        <UnoTracker />
      </main>
    </>
  );
}

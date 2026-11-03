import type { Metadata } from "next";
import Header from "@/components/header";
import UnoTracker from "@/components/unotracker";
import layout from "@/styles/cardgame.module.css";

export const metadata: Metadata = { title: "Uno tracker" };
export default function UnoPage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs game />
      <main id="main-content">
        <UnoTracker />
      </main>
    </div>
  );
}

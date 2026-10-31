import Suits from "@/components/suits";
import { Metadata } from "next";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata: Metadata = {
  title: "Suits",
  description: "Pick a suit, reveal four cards. A Ben Palmer original.",
  openGraph: {
    title: "Suits | Almost Yellow",
    description: "Pick a suit, reveal four cards. A Ben Palmer original.",
  },
};

export default function SuitsPage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <Suits />
      </main>
    </div>
  );
}

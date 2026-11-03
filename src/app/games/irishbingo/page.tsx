import IrishBingo from "@/components/irishbingo";
import { Metadata } from "next";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata: Metadata = {
  title: "Irish Bingo",
  description: "The most fun you can have with a pack of cards.",
  openGraph: {
    title: "Irish Bingo | Almost Yellow",
    description: "The most fun you can have with a pack of cards.",
  },
};

export default function IrishBingoPage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <IrishBingo />
      </main>
    </div>
  );
}

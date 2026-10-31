import RedOrBlack from "@/components/redorblack";
import { Metadata } from "next";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata: Metadata = {
  title: "Red or Black v1",
  description: "Guess the colour of the next card. A Ben Palmer original.",
  openGraph: {
    title: "Red or Black v1 | Almost Yellow",
    description: "Guess the colour of the next card. A Ben Palmer original.",
  },
};

export default function RedOrBlackPage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <RedOrBlack />
      </main>
    </div>
  );
}

import RedOrBlack from "@/components/redorblack";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Red or Black v1",
  "Guess the colour of the next card. A Ben Palmer original.",
);

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

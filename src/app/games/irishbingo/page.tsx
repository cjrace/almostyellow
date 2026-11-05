import IrishBingo from "@/components/irishbingo";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Irish Bingo",
  "Call cards for Irish Bingo with a shuffled 52-card deck, a list of called cards and rules for playing together with any number of players.",
);

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

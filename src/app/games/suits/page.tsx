import Suits, { SuitsTitle } from "@/components/suits";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Suits",
  "Pick a suit, reveal four cards. A Ben Palmer original.",
);

export default function SuitsPage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs={true} game={true} title={<SuitsTitle />} />

      <main id="main-content">
        <Suits />
      </main>
    </div>
  );
}

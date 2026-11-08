import CowRace, { CowRaceTitle } from "@/components/cowrace";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Cow race",
  "Pick your cows and watch them race to the finish line.",
);

export default function CowRacePage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs={true} game={true} title={<CowRaceTitle />} />

      <main id="main-content" data-game>
        <CowRace />
      </main>
    </div>
  );
}

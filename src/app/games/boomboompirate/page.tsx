import { Title } from "@mantine/core";
import BoomBoomPirate from "@/components/boomboompirate";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Boom Boom Pirate",
  "Pull the right ropes or things will go boom!",
);

export default function BoomBoomPiratePage() {
  return (
    <div className={layout.screen}>
      <Header
        noCrumbs={true}
        game={true}
        title={<Title>Boom Boom Pirate</Title>}
      />

      <main id="main-content">
        <BoomBoomPirate />
      </main>
    </div>
  );
}

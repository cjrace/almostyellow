import { Space, Title } from "@mantine/core";
import BoomBoomPirate from "@/components/boomboompirate";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Boom Boom Pirate",
  "Play Boom Boom Pirate together: choose 5 to 50 ropes, take turns pulling them and try to avoid the pirate's hidden trap.",
);

export default function BoomBoomPiratePage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <Title
          fz={{
            base: "var(--mantine-h2-font-size)",
            sm: "var(--mantine-h1-font-size)",
          }}
        >
          Boom Boom Pirate
        </Title>
        <Space h="md" />
        <BoomBoomPirate />
      </main>
    </div>
  );
}

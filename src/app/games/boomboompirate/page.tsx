import { Space, Title } from "@mantine/core";
import BoomBoomPirate from "@/components/boomboompirate";
import { Metadata } from "next";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata: Metadata = {
  title: "Boom Boom Pirate",
  description: "Pull the right ropes or things will go boom!",
  openGraph: {
    title: "Boom Boom Pirate | Almost Yellow",
    description: "Pull the right ropes or things will go boom!",
  },
};

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

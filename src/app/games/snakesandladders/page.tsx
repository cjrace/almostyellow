import { Title, Space } from "@mantine/core";
import SnakesAndLadders from "@/components/snakesandladders";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Snakes and Ladders",
  "Play Snakes and Ladders together on one screen. Choose names and avatars for 2 to 10 players, roll the dice and race to square 100.",
);

export default function SnakesAndLaddersPage() {
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
          Snakes and Ladders
        </Title>
        <Space h="md" />
        <SnakesAndLadders />
      </main>
    </div>
  );
}

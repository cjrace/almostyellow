import { Title, Space } from "@mantine/core";
import SnakesAndLadders from "@/components/snakesandladders";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";

export const metadata = pageMetadata(
  "Snakes and Ladders",
  "There are snakes, there are ladders, what more could you want?",
);

export default function SnakesAndLaddersPage() {
  return (
    <>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <Title>Snakes and Ladders</Title>
        <Space h="xl" />
        <SnakesAndLadders />
      </main>
    </>
  );
}

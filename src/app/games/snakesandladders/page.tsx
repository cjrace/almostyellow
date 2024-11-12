import { Title, Space } from "@mantine/core";
import SnakesAndLadders from "@/components/snakesandladders";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Snakes and Ladders",
  description: "There are snakes, there are ladders, what more could you want?",
  openGraph: {
    title: "Snakes and Ladders | Almost Yellow",
    description:
      "There are snakes, there are ladders, what more could you want?",
  },
};

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

import { SimpleGrid, Title, Space } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";
import GamesCard from "@/components/gamescard";

export const metadata: Metadata = {
  title: "Games",
  description: "Our collection of online games.",
  openGraph: {
    title: "Games | Almost Yellow",
    description: "Our collection of online games.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "" },
];

export default async function Games() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main>
        <Title>Our games</Title>
        <Space h="xl" />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          <GamesCard
            imagePath="/images/cow.svg"
            title="Irish Bingo"
            description="Be the first to flip all your cards and shout 'Bingo!' before anyone else. Are you feeling lucky?"
            link="/games/irishbingo"
            linktext="Irish Bingo"
          />

          <GamesCard
            imagePath="/images/cow.svg"
            title="Snakes and Ladders"
            description="Climb ladders, avoid snakes, and race your way to the trophy. Who will get there first?"
            link="/games/snakesandladders"
            linktext="Snakes and Ladders"
          />

          <GamesCard
            imagePath="/images/cow.svg"
            title="Boom Boom Pirate"
            description="... ... BOOM!"
            link="/games/boomboompirate"
            linktext="Boom Boom Pirate"
          />

          <GamesCard
            imagePath="/images/cow.svg"
            title="Uno"
            description="Succumb to the whims of the Uno gods, try and play your cards wisely!"
            link="/games/uno"
            linktext="Uno"
          />
        </SimpleGrid>
      </main>
    </>
  );
}

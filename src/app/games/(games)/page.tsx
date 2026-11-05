import { SimpleGrid, Stack, Title } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";
import GamesCard from "@/components/gamescard";
import layout from "@/styles/cardgame.module.css";

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

export default function Games() {
  return (
    <div className={layout.screen}>
      <Header crumbs={crumbitems} />

      <Stack component="main" id="main-content" gap="md">
        <Title>Our games</Title>

        <SimpleGrid
          cols={{ base: 1, sm: 2, lg: 4 }}
          spacing="lg"
          style={{ flex: "1 1 0", gridAutoRows: "minmax(min-content, 1fr)" }}
        >
          <GamesCard
            imagePath="/images/almo-border.png"
            title="Quiz buzzer"
            description="Join a room and buzz in with friends."
            link="/games/buzzer"
            linktext="Quiz buzzer"
          />
          <GamesCard
            imagePath="/images/almo-border.png"
            title="Irish Bingo"
            description="Be the first to flip all your cards and shout 'Bingo!' before anyone else. Are you feeling lucky?"
            link="/games/irishbingo"
            linktext="Irish Bingo"
          />

          <GamesCard
            imagePath="/images/almo-border.png"
            title="Snakes and Ladders"
            description="Climb ladders, avoid snakes, and race your way to the trophy. Who will get there first?"
            link="/games/snakesandladders"
            linktext="Snakes and Ladders"
          />

          <GamesCard
            imagePath="/images/almo-border.png"
            title="Boom Boom Pirate"
            description="... ... BOOM!"
            link="/games/boomboompirate"
            linktext="Boom Boom Pirate"
          />

          <GamesCard
            imagePath="/images/almo-border.png"
            title="Uno tracker"
            description="The whims of the Uno gods, faithfully recorded: lifetime wins, records and trends."
            link="/games/uno-tracker"
            linktext="Uno tracker"
          />

          <GamesCard
            imagePath="/images/almo-border.png"
            title="Red or Black v1"
            description="Red or black? Simple but deadly. A Ben Palmer original."
            link="/games/redorblack"
            linktext="Red or Black v1"
          />

          <GamesCard
            imagePath="/images/almo-border.png"
            title="Suits"
            description="Pick your suit and reap the consequences. Another Ben Palmer special."
            link="/games/suits"
            linktext="Suits"
          />
        </SimpleGrid>
      </Stack>
    </div>
  );
}

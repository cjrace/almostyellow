import { Button, Group } from "@mantine/core";
import Confetti from "@/components/confetti";
import {
  IconDeviceGamepad2,
  IconMoodPuzzled,
  IconCheese,
  IconGlassCocktail,
  IconBeach,
  IconPaperclip,
  IconBrandGithub,
} from "@tabler/icons-react";

export default function Home() {
  return (
    <>
      <h1 style={{ textAlign: "center" }}>Almost yellow</h1>
      <p style={{ textAlign: "center" }}>
        This is our homepage, we should make it prettier.
      </p>
      <Confetti />

      <Group justify="center">
        <Button
          leftSection={<IconDeviceGamepad2 />}
          variant="default"
          component="a"
          size="xl"
          href="/games"
        >
          View our games
        </Button>

        <Button
          leftSection={<IconMoodPuzzled />}
          variant="default"
          component="a"
          size="xl"
          href="/decisionmaker"
        >
          How we make decisions
        </Button>

        <Button
          leftSection={<IconCheese />}
          variant="default"
          component="a"
          size="xl"
          href="/recipes"
        >
          Our recipes
        </Button>

        <Button
          leftSection={<IconGlassCocktail />}
          variant="default"
          component="a"
          size="xl"
          href="/cocktails"
        >
          Cocktail time!
        </Button>

        <Button
          leftSection={<IconBeach />}
          variant="default"
          component="a"
          size="xl"
          href="/holidays"
        >
          Our holidays!
        </Button>

        <Button
          leftSection={<IconPaperclip />}
          variant="default"
          component="a"
          size="xl"
          href="/admin"
        >
          Admin stuff
        </Button>

        <Button
          leftSection={<IconBrandGithub />}
          target="_blank"
          variant="default"
          rel="noopener noreferrer"
          component="a"
          size="xl"
          href="https://github.com/cjrace/almostyellow"
        >
          Source code
        </Button>
      </Group>
    </>
  );
}

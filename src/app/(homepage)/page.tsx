import { Button, Group, ActionIcon } from "@mantine/core";
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
import ToggleColour from "@/components/togglecolour";

export default function Home() {
  return (
    <>
      <Group h="100%" px="md" justify="flex-end">
        <ActionIcon
          component="a"
          href="https://github.com/cjrace/almostyellow"
          size="xl"
          aria-label="Open GitHub repository in a new tab"
          target="_blank"
          variant="default"
          rel="noopener noreferrer"
        >
          {<IconBrandGithub />}
        </ActionIcon>
        <ToggleColour />
      </Group>
      <h1 style={{ textAlign: "center" }}>Almost yellow</h1>
      <p style={{ textAlign: "center" }}>
        This is our homepage, we should make it prettier.
      </p>

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
      </Group>

      <Group justify="center">
        <Confetti />
        <Button
          leftSection={<IconPaperclip />}
          variant="default"
          component="a"
          size="xl"
          href="/admin"
        >
          Admin stuff
        </Button>
      </Group>
    </>
  );
}

import { Button, Group, ActionIcon, Space } from "@mantine/core";
import playConfetti from "@/components/playconfetti";
import {
  IconDeviceGamepad2,
  IconMoodPuzzled,
  IconCheese,
  IconGlassCocktail,
  IconBeach,
  IconPaperclip,
  IconBrandGithub,
  IconConfetti,
} from "@tabler/icons-react";
import ToggleColour from "@/components/togglecolour";

export default function Home() {
  return (
    <>
      <Group h="100%" px="md" justify="flex-end">
        <ActionIcon
          onClick={playConfetti}
          variant="default"
          size="xl"
          aria-label="Fire confetti canons"
        >
          <IconConfetti />
        </ActionIcon>

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

      <Space h="lg" />

      <Group justify="center">
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

import { Button, Group, Title, Space } from "@mantine/core";
import {
  IconDeviceGamepad2,
  IconMoodPuzzled,
  IconCheese,
  IconGlassCocktail,
  IconPaperclip,
  IconGlass,
} from "@tabler/icons-react";
import Header from "@/components/header";
import styles from "@/styles/gradient.module.css";

export default function Home() {
  return (
    <>
      <Header noCrumbs={true} />

      <main id="main-content">
        <Title className={styles.gradient} ta="center">
          Almost Yellow
        </Title>

        <Space h="xl" />

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
            leftSection={<IconGlass />}
            variant="default"
            component="a"
            size="xl"
            href="/whiskyjournal"
          >
            Cam&apos;s whisky journal
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
      </main>
    </>
  );
}

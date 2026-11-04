import { Group, Title, Space } from "@mantine/core";
import {
  IconDeviceGamepad2,
  IconMoodPuzzled,
  IconCheese,
  IconGlassCocktail,
  IconPaperclip,
  IconGlass,
  IconMovie,
} from "@tabler/icons-react";
import Header from "@/components/header";
import ButtonLink from "@/components/buttonlink";
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
          <ButtonLink
            leftSection={<IconDeviceGamepad2 />}
            variant="default"
            size="xl"
            href="/games"
          >
            View our games
          </ButtonLink>

          <ButtonLink
            leftSection={<IconMoodPuzzled />}
            variant="default"
            size="xl"
            href="/decisionmaker"
          >
            How we make decisions
          </ButtonLink>

          <ButtonLink
            leftSection={<IconCheese />}
            variant="default"
            size="xl"
            href="/recipes"
          >
            Our recipes
          </ButtonLink>

          <ButtonLink
            leftSection={<IconGlassCocktail />}
            variant="default"
            size="xl"
            href="/cocktails"
          >
            Cocktail time!
          </ButtonLink>

          <ButtonLink
            leftSection={<IconGlass />}
            variant="default"
            size="xl"
            href="/whiskyjournal"
          >
            Cam&apos;s whisky journal
          </ButtonLink>

          <ButtonLink
            leftSection={<IconMovie />}
            variant="default"
            size="xl"
            href="/films"
          >
            Cam&apos;s film list
          </ButtonLink>
        </Group>

        <Space h="lg" />

        <Group justify="center">
          <ButtonLink
            leftSection={<IconPaperclip />}
            variant="default"
            size="xl"
            href="/admin"
          >
            Admin stuff
          </ButtonLink>
        </Group>
      </main>
    </>
  );
}

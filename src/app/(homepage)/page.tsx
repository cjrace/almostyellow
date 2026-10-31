import { Button, Group, Title, Space } from "@mantine/core";
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
import styles from "@/styles/gradient.module.css";
import home from "@/styles/home.module.css";
import { siteUrl } from "@/routes";

// Tells search engines the name of the site
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Almost Yellow",
  url: siteUrl,
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Built from constants above, never user input
        // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
            classNames={{ root: home.button, label: home.label }}
            href="/games"
          >
            View our games
          </Button>

          <Button
            leftSection={<IconMoodPuzzled />}
            variant="default"
            component="a"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/decisionmaker"
          >
            How we make decisions
          </Button>

          <Button
            leftSection={<IconCheese />}
            variant="default"
            component="a"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/recipes"
          >
            Our recipes
          </Button>

          <Button
            leftSection={<IconGlassCocktail />}
            variant="default"
            component="a"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/cocktails"
          >
            Cocktail time!
          </Button>

          <Button
            leftSection={<IconGlass />}
            variant="default"
            component="a"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/whiskyjournal"
          >
            Cam&apos;s whisky journal
          </Button>

          <Button
            leftSection={<IconMovie />}
            variant="default"
            component="a"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/films"
          >
            Cam&apos;s film list
          </Button>
        </Group>

        <Space h="lg" />

        <Group justify="center">
          <Button
            leftSection={<IconPaperclip />}
            variant="default"
            component="a"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/admin"
          >
            Admin stuff
          </Button>
        </Group>
      </main>
    </>
  );
}

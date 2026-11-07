import { Group, Title, Space } from "@mantine/core";
import {
  IconDeviceGamepad2,
  IconMoodPuzzled,
  IconGlassCocktail,
  IconPaperclip,
  IconGlass,
  IconMovie,
  IconTool,
} from "@tabler/icons-react";
import Header from "@/components/header";
import ButtonLink from "@/components/buttonlink";
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
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
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
            classNames={{ root: home.button, label: home.label }}
            href="/games"
          >
            View our games
          </ButtonLink>

          <ButtonLink
            leftSection={<IconMoodPuzzled />}
            variant="default"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/decisionmaker"
          >
            How we make decisions
          </ButtonLink>

          <ButtonLink
            leftSection={<IconGlassCocktail />}
            variant="default"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/cocktails"
          >
            Cocktail time!
          </ButtonLink>

          <ButtonLink
            leftSection={<IconGlass />}
            variant="default"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/whiskyjournal"
          >
            Cam&apos;s whisky journal
          </ButtonLink>

          <ButtonLink
            leftSection={<IconMovie />}
            variant="default"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/films"
          >
            Cam&apos;s film list
          </ButtonLink>
          <ButtonLink
            leftSection={<IconTool />}
            variant="default"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/tools"
          >
            Tools
          </ButtonLink>
        </Group>

        <Space h="lg" />

        <Group justify="center">
          <ButtonLink
            leftSection={<IconPaperclip />}
            variant="default"
            size="xl"
            classNames={{ root: home.button, label: home.label }}
            href="/admin"
          >
            Admin stuff
          </ButtonLink>
        </Group>
      </main>
    </>
  );
}

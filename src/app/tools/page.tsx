import { Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconTextSize } from "@tabler/icons-react";
import Header from "@/components/header";
import ButtonLink from "@/components/buttonlink";
import { pageMetadata } from "@/metadata";

export const metadata = pageMetadata(
  "Tools",
  "Simple tools you can use in your browser, starting with a word and character counter.",
);

export default function ToolsPage() {
  return (
    <>
      <Header noCrumbs homeOnly />
      <Stack component="main" id="main-content" gap="xl">
        <Title>Tools</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          <Paper component="article" withBorder radius="md" p="lg">
            <Stack align="flex-start">
              <IconTextSize size={32} aria-hidden />
              <Title order={2} size="h3">
                Word and character counter
              </Title>
              <Text c="dimmed">
                Count words and characters instantly, compare counting methods
                and check highlighted text. Everything stays in your browser.
              </Text>
              <ButtonLink href="/tools/word-counter" variant="default">
                Open word counter
              </ButtonLink>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </>
  );
}

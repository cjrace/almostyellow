import { Group, Stack, Text, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import Header from "@/components/header";
import WordCounter from "@/components/wordcounter";
import { pageMetadata } from "@/metadata";

export const metadata = pageMetadata(
  "Word & character counter",
  "Count words and characters, compare counting methods and check selected text. Your text stays in your browser.",
);

export default function WordCounterPage() {
  return (
    <>
      <Header noCrumbs tools />
      <Stack component="main" id="main-content" gap="lg" maw={1200} mx="auto">
        <Stack gap="xs">
          <Title>Word &amp; character counter</Title>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconLock
              size={20}
              style={{ flexShrink: 0, marginTop: 3 }}
              aria-hidden
            />
            <Text c="dimmed">
              Your text stays in your browser. Nothing is uploaded or saved.
            </Text>
          </Group>
        </Stack>
        <WordCounter />
      </Stack>
    </>
  );
}

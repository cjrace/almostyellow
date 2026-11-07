import { Group, Stack, Text, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import Header from "@/components/header";
import WordCounter from "@/components/wordcounter";
import { pageMetadata } from "@/metadata";
import styles from "@/styles/wordcounter.module.css";

export const metadata = pageMetadata(
  "Word and character counter",
  "Free online word and character counter. Count with and without spaces, or just highlighted text. Private: your text stays in your browser.",
);

export default function WordCounterPage() {
  return (
    <div className={styles.page}>
      <Header noCrumbs tools />
      <Stack
        component="main"
        id="main-content"
        className={styles.main}
        maw={1200}
        mx="auto"
      >
        <Stack gap="xs">
          <Title fz={{ base: "1.75rem", md: undefined }}>
            Word and character counter
          </Title>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconLock
              size={20}
              style={{ flexShrink: 0, marginTop: 3 }}
              aria-hidden
            />
            <Text c="dimmed">Your text stays in your browser.</Text>
          </Group>
        </Stack>
        <WordCounter />
      </Stack>
    </div>
  );
}

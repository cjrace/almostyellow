"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  NativeSelect,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import styles from "@/styles/wordcounter.module.css";
import CountingMethodInfo from "@/components/countingmethodinfo";
import {
  countText,
  countingMethods,
  supportsSegmentation,
  type CountingMethod,
  type TextCounts,
} from "@/components/textcount";

const subscribe = () => () => undefined;

function describeCounts(counts: TextCounts) {
  return `${counts.words.toString()} ${counts.words === 1 ? "word" : "words"}, ${counts.characters.toString()} ${counts.characters === 1 ? "character" : "characters"}`;
}

function Counts({
  title,
  counts,
  highlighted,
  desktopOnly = false,
}: {
  title: string;
  counts: TextCounts | null;
  // Shown in brackets after each count on phones, where there is no separate
  // box for the selected text.
  highlighted?: TextCounts | null;
  desktopOnly?: boolean;
}) {
  return (
    <Paper
      component="section"
      aria-label={title}
      withBorder
      p="lg"
      radius="md"
      style={{ flex: 1 }}
      visibleFrom={desktopOnly ? "md" : undefined}
    >
      <Title order={2} size="h4" mb="sm">
        {title}
      </Title>
      <SimpleGrid cols={2} component="dl" m={0}>
        {(["words", "characters"] as const).map((kind) => (
          <div key={kind}>
            <Text component="dt" size="sm" c="dimmed">
              {kind === "words" ? "Words" : "Characters"}
            </Text>
            <Text
              component="dd"
              m={0}
              size="2rem"
              fw={600}
              style={{
                fontVariantNumeric: "tabular-nums",
                overflowWrap: "anywhere",
              }}
            >
              {counts?.[kind] ?? "—"}
              {highlighted && (
                <Text component="span" inherit c="dimmed" hiddenFrom="md">
                  {" "}
                  (<VisuallyHidden>selected </VisuallyHidden>
                  {highlighted[kind]})
                </Text>
              )}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </Paper>
  );
}

export default function WordCounter() {
  const [text, setText] = useState("");
  const [method, setMethod] = useState<CountingMethod>("unicode");
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [infoOpened, setInfoOpened] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const segmentationSupported = useSyncExternalStore<boolean | null>(
    subscribe,
    supportsSegmentation,
    () => null,
  );
  const supported = method === "legacy" || segmentationSupported === true;
  const whole = useMemo(() => {
    // Text starts empty. Wait for browser support before running an engine
    // during hydration, including on browsers without Intl.Segmenter.
    if (segmentationSupported === null) return { words: 0, characters: 0 };
    return supported ? countText(text, method) : null;
  }, [text, method, supported, segmentationSupported]);
  const selected = useMemo(
    () =>
      supported && selection
        ? countText(text.slice(selection.start, selection.end), method)
        : null,
    [text, method, selection, supported],
  );
  const summary = whole
    ? `Whole text: ${describeCounts(whole)}. ${selected ? `Selected text: ${describeCounts(selected)}.` : "No text selected."}`
    : "Choose a supported counting method.";
  // Announce only after a pause; visible counts still update on every edit.
  const [announcement] = useDebouncedValue(summary, 800);

  function readSelection() {
    const input = editorRef.current;
    if (!input || document.activeElement !== input) return;
    const { selectionStart: start, selectionEnd: end } = input;
    setSelection((previous) => {
      if (start === end) return null;
      if (previous?.start === start && previous.end === end) return previous;
      return { start, end };
    });
  }

  useEffect(() => {
    // Mobile selection handles can move without a keyboard or pointer event.
    document.addEventListener("selectionchange", readSelection);
    return () => {
      document.removeEventListener("selectionchange", readSelection);
    };
  }, []);

  return (
    <Stack gap="lg">
      {segmentationSupported === false && (
        <Alert
          title="Your browser does not support Unicode segmentation"
          color="orange"
        >
          Unicode-aware and whitespace-separated counting are unavailable.
          Choose Legacy string counting, or update your browser to use the other
          methods.
        </Alert>
      )}
      <div className={styles.layout}>
        <div className={styles.method}>
          <Group gap="xs" align="flex-end" wrap="nowrap" maw={420}>
            <NativeSelect
              label="Counting method"
              value={method}
              onChange={(event) => {
                setMethod(event.currentTarget.value as CountingMethod);
              }}
              style={{ flex: 1, minWidth: 0 }}
              size="md"
            >
              {countingMethods.map((preset) => (
                <option
                  key={preset.value}
                  value={preset.value}
                  disabled={
                    preset.needsSegmenter && segmentationSupported !== true
                  }
                >
                  {preset.label}
                </option>
              ))}
            </NativeSelect>
            <ActionIcon
              aria-label="About counting methods"
              variant="subtle"
              size="lg"
              onClick={() => {
                setInfoOpened(true);
              }}
            >
              <IconInfoCircle aria-hidden />
            </ActionIcon>
          </Group>
        </div>
        <div className={styles.editor}>
          <Stack gap="xs" h="100%">
            <Textarea
              ref={editorRef}
              label="Your text"
              placeholder="Paste or type your text here..."
              description="Highlight any part to count it separately."
              value={text}
              onChange={(event) => {
                setText(event.currentTarget.value);
                setSelection(null);
              }}
              onSelect={readSelection}
              onKeyUp={readSelection}
              onPointerUp={readSelection}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              size="md"
              rows={10}
              resize="vertical"
              // Grow to match the column beside it on desktop.
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
              styles={{
                wrapper: { flex: 1 },
                input: { height: "100%", minHeight: 220 },
              }}
            />
            <Button
              color="red"
              variant="light"
              fullWidth
              // The light variant is a dark maroon in dark mode, so use the
              // brighter filled red there.
              style={{
                "--button-bg":
                  "light-dark(var(--mantine-color-red-light), var(--mantine-color-red-8))",
                "--button-hover":
                  "light-dark(var(--mantine-color-red-light-hover), var(--mantine-color-red-9))",
                "--button-color":
                  "light-dark(var(--mantine-color-red-light-color), var(--mantine-color-white))",
              }}
              onClick={() => {
                setText("");
                setSelection(null);
                editorRef.current?.focus();
              }}
            >
              Clear text
            </Button>
          </Stack>
        </div>
        <div className={styles.counts}>
          <Stack gap="md" h="100%">
            <Counts title="Whole text" counts={whole} highlighted={selected} />
            <Counts title="Selected text" counts={selected} desktopOnly />
            {!selection && (
              <Text size="sm" c="dimmed">
                Highlight text in the editor to see its counts.
              </Text>
            )}
          </Stack>
        </div>
      </div>
      <VisuallyHidden role="status" aria-atomic="true">
        {announcement}
      </VisuallyHidden>
      <CountingMethodInfo
        opened={infoOpened}
        onClose={() => {
          setInfoOpened(false);
        }}
        segmentationSupported={segmentationSupported === true}
      />
    </Stack>
  );
}

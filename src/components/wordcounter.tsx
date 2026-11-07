"use client";

import {
  useEffect,
  useId,
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
  Input,
  NativeSelect,
  Paper,
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
  return `${counts.words.toString()} ${counts.words === 1 ? "word" : "words"}, ${counts.characters.toString()} characters with spaces, ${counts.charactersWithoutSpaces.toString()} without spaces`;
}

const rows = [
  ["words", "Words"],
  ["characters", "Characters with spaces"],
  ["charactersWithoutSpaces", "Characters without spaces"],
] as const;

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
      p={{ base: "sm", md: "lg" }}
      radius="md"
      style={{ flex: 1 }}
      visibleFrom={desktopOnly ? "md" : undefined}
    >
      <Title order={2} size="h4" mb={{ base: 6, md: "sm" }}>
        {title}
      </Title>
      <dl className={styles.countList}>
        {rows.map(([kind, label]) => (
          <div key={kind} className={styles.count}>
            <Text component="dt" size="sm" c="dimmed">
              {label}
            </Text>
            <Text
              component="dd"
              m={0}
              size="1.5rem"
              lh={1.2}
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
      </dl>
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
  const methodId = useId();
  const segmentationSupported = useSyncExternalStore<boolean | null>(
    subscribe,
    supportsSegmentation,
    () => null,
  );
  const supported = method === "legacy" || segmentationSupported === true;
  const whole = useMemo(() => {
    // Text starts empty. Wait for browser support before running an engine
    // during hydration, including on browsers without Intl.Segmenter.
    if (segmentationSupported === null)
      return { words: 0, characters: 0, charactersWithoutSpaces: 0 };
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
    <Stack gap="lg" className={styles.root}>
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
          <Stack gap="xs" maw={420}>
            <Group gap={4} wrap="nowrap">
              <Input.Label htmlFor={methodId} size="md">
                Counting method
              </Input.Label>
              <ActionIcon
                aria-label="About counting methods"
                variant="subtle"
                size="md"
                onClick={() => {
                  setInfoOpened(true);
                }}
              >
                <IconInfoCircle size={20} aria-hidden />
              </ActionIcon>
            </Group>
            <NativeSelect
              id={methodId}
              value={method}
              onChange={(event) => {
                setMethod(event.currentTarget.value as CountingMethod);
              }}
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
          </Stack>
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
              rows={5}
              resize="vertical"
              // Grow to match the column beside it on desktop.
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
              classNames={{ input: styles.input }}
              styles={{
                description: { marginBottom: "var(--mantine-spacing-sm)" },
                wrapper: { flex: 1 },
                input: { height: "100%" },
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

"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { names } from "@/uno/model";
import { useUno } from "@/uno/useUno";
import styles from "@/styles/uno.module.css";

// One fixed-size line in the header, so connection and sync changes never move
// the content below it. The full explanation is in the dialog it opens.
export function UnoStatus() {
  const uno = useUno();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = uno.data.events.length;
  const attention = uno.data.events.filter((e) => e.status === "attention");
  const problem =
    uno.error ||
    (attention.length
      ? `${String(attention.length)} saved ${attention.length === 1 ? "change needs" : "changes need"} attention`
      : "");
  const changes = `${String(pending)} saved ${pending === 1 ? "change" : "changes"}`;
  const text = !uno.ready
    ? "Loading saved scores…"
    : problem ||
      (uno.syncing
        ? `Syncing ${changes}…`
        : pending
          ? `${uno.online ? "On this device" : "Offline"} · ${changes}, not yet synced`
          : !uno.online
            ? "Offline · showing saved scores"
            : uno.notice || "All scores saved");
  const tone = problem
    ? "error"
    : !uno.ready || uno.syncing
      ? "busy"
      : pending || !uno.online
        ? "warn"
        : "ok";
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Could not complete this action. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div
        className={styles.statusSlot}
        role={problem ? "alert" : "status"}
        aria-label={problem ? "Scores need attention" : undefined}
      >
        <UnstyledButton
          className={styles.pill}
          data-tone={tone}
          aria-haspopup="dialog"
          title="Show sync details"
          onClick={() => {
            setOpen(true);
          }}
        >
          {tone === "busy" ? (
            <Loader size={12} color="currentColor" />
          ) : (
            <span className={styles.dot} aria-hidden="true" />
          )}
          <span className={styles.pillText}>{text}</span>
        </UnstyledButton>
      </div>
      <Modal
        opened={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Sync details"
        closeButtonProps={{ "aria-label": "Close sync details" }}
        centered
      >
        <Text>{text}</Text>
        {!uno.online && (
          <Text size="sm" mt="xs">
            You can keep scoring offline. Saved rounds sync when you reconnect,
            and a game can only be finished while connected.
            {uno.data.checkedAt
              ? ` Scores last checked ${new Date(uno.data.checkedAt).toLocaleString("en-GB")}.`
              : ""}
          </Text>
        )}
        {!!pending && (
          <Text size="sm" mt="xs">
            Totals include provisional changes saved on this device. All saved
            changes must sync before a game can be finished.
          </Text>
        )}
        {problem !== text && problem && (
          <Text size="sm" mt="xs">
            {problem}
          </Text>
        )}
        {message && (
          <Alert color="orange" mt="sm">
            {message}
          </Alert>
        )}
        {attention.map((event) => (
          <Paper withBorder p="sm" mt="sm" key={event.id}>
            <Text>
              {names[event.player]} {event.delta > 0 ? "+1" : "−1"} · game{" "}
              {event.gameId.slice(0, 8)}
            </Text>
            <Text size="sm">{event.error}</Text>
            <Group mt="xs">
              <Button
                variant="light"
                disabled={!uno.online || busy}
                onClick={() => {
                  void act(() => uno.retry(event.id));
                }}
              >
                Retry change
              </Button>
              <Button
                variant="subtle"
                color="red"
                onClick={() => {
                  void act(() => uno.discard(event.id));
                }}
              >
                Discard change…
              </Button>
            </Group>
          </Paper>
        ))}
      </Modal>
    </>
  );
}

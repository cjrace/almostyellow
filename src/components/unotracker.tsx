"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Anchor,
  Button,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Text,
  Title,
} from "@mantine/core";
import { names, players, result, type Game } from "@/uno/model";
import { useUno } from "@/uno/useUno";
import { unoController } from "@/uno/browser";
import styles from "@/styles/uno.module.css";

export function UnoHeader({ stats = false }: { stats?: boolean }) {
  return (
    <header className={styles.header}>
      <Title>Uno tracker</Title>
      <SegmentedControl
        aria-label="Uno pages"
        value={stats ? "stats" : "tracker"}
        onChange={(value) => {
          window.location.assign(
            value === "stats"
              ? "/games/uno-tracker/stats"
              : "/games/uno-tracker",
          );
        }}
        data={[
          { value: "tracker", label: "Tracker" },
          { value: "stats", label: "Statistics" },
        ]}
        fullWidth
        size="md"
      />
    </header>
  );
}

function activeWorker(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorker> {
  const worker =
    registration.active ?? registration.installing ?? registration.waiting;
  if (!worker)
    return Promise.reject(new Error("Offline worker is unavailable."));
  if (worker.state === "activated") return Promise.resolve(worker);
  return new Promise((resolve, reject) => {
    function changed() {
      if (worker?.state === "activated") {
        worker.removeEventListener("statechange", changed);
        resolve(worker);
      } else if (worker?.state === "redundant") {
        worker.removeEventListener("statechange", changed);
        reject(new Error("Offline worker could not activate."));
      }
    }
    worker.addEventListener("statechange", changed);
  });
}
export function UnoOfflineShell() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/games/uno-tracker/sw.js", { scope: "/games/uno-tracker" })
      .then(activeWorker)
      .then((worker) => {
        worker.postMessage({
          type: "cache-uno",
          assets: performance
            .getEntriesByType("resource")
            .map((entry) => entry.name),
        });
      })
      .catch(() => undefined);
  }, []);
  return null;
}

export default function UnoTracker() {
  const uno = useUno();
  const [confirmation, setConfirmation] = useState<Game | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { game, data } = uno;
  const pending = data.events.length;
  const attention = data.events.filter((e) => e.status === "attention");
  const outcome = game ? result(game) : null;
  const status = uno.syncing
    ? `Syncing ${String(pending)} saved changes…`
    : pending
      ? `${uno.online ? "On this device" : "Offline"} · ${String(pending)} saved ${pending === 1 ? "change" : "changes"}${attention.length ? " need attention" : ", not yet synced"}`
      : !uno.online
        ? "Offline · showing saved scores"
        : uno.notice || "All scores saved";
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
    <div className={styles.tracker}>
      <UnoHeader />
      <UnoOfflineShell />
      <div className={styles.players} aria-label="Lifetime round wins">
        {players.map((player) => (
          <Paper withBorder p="sm" key={player}>
            <Text size="sm">{names[player]} · all time</Text>
            <Text
              className={styles.lifetime}
              data-testid={`lifetime-${player}`}
            >
              {uno.totals[player]}
            </Text>
          </Paper>
        ))}
      </div>
      <section aria-labelledby="current-game">
        <Title order={2} id="current-game" size="h3">
          {game?.status === "completed"
            ? "Last completed game"
            : "Current game"}
        </Title>
        <Text role="status" size="sm" className={styles.status}>
          {uno.ready ? status : "Loading saved scores…"}
        </Text>
        {!!pending && (
          <Text size="xs">
            Totals include provisional changes saved on this device.
          </Text>
        )}
        {!uno.ready ? (
          <Text>Opening device storage…</Text>
        ) : !game ? (
          <Text my="md">
            No game in progress. Start one when you are ready.
          </Text>
        ) : (
          <>
            <div className={styles.players}>
              {players.map((player) => (
                <Paper
                  component="section"
                  aria-label={`${names[player]}'s game score`}
                  withBorder
                  p="sm"
                  key={player}
                  className={styles.player}
                >
                  <Title order={3} size="h3">
                    {names[player]}
                  </Title>
                  <Text
                    className={styles.score}
                    data-testid={`score-${player}`}
                  >
                    {game[player]}
                  </Text>
                  {game.status === "active" && (
                    <>
                      <Button
                        fullWidth
                        className={styles.add}
                        disabled={!uno.canScore}
                        aria-label={`Add a round for ${names[player]}`}
                        onClick={() => {
                          void uno.score(player, 1);
                        }}
                      >
                        +1
                      </Button>
                      <Button
                        fullWidth
                        variant="subtle"
                        className={styles.correct}
                        disabled={!uno.canScore || game[player] <= 0}
                        aria-label={`Remove a round for ${names[player]}`}
                        onClick={() => {
                          void uno.score(player, -1);
                        }}
                      >
                        −1
                      </Button>
                    </>
                  )}
                </Paper>
              ))}
            </div>
            {game.status === "completed" && (
              <Paper p="sm" className={styles.result} aria-live="polite">
                <Text fw={700}>
                  {outcome?.winner === "draw"
                    ? "It’s a draw!"
                    : `${names[outcome?.winner ?? "cam"]} wins!`}
                </Text>
                <Text size="sm">
                  {outcome?.rounds} rounds · {outcome?.margin} point margin
                </Text>
                {game.amended && (
                  <Text size="sm">
                    Result amended after offline rounds synced.
                  </Text>
                )}
              </Paper>
            )}
          </>
        )}
        {data.accountId ? (
          game?.status === "active" ? (
            <>
              <Button
                fullWidth
                mt="sm"
                className={styles.control}
                variant="light"
                disabled={
                  !uno.online ||
                  !uno.verified ||
                  pending > 0 ||
                  uno.syncing ||
                  busy
                }
                onClick={() => {
                  setConfirmation({ ...game });
                }}
              >
                Finish game
              </Button>
              {!uno.online && (
                <Text size="sm">
                  Reconnect to finish this game. You can keep scoring offline.
                </Text>
              )}
              {!!pending && uno.online && (
                <Text size="sm">
                  All saved changes must sync before finishing.
                </Text>
              )}
            </>
          ) : (
            <Button
              fullWidth
              className={styles.control}
              mt="md"
              disabled={!uno.online || !uno.verified || pending > 0 || busy}
              onClick={() => {
                void act(uno.start);
              }}
            >
              Start new game
            </Button>
          )
        ) : (
          uno.ready && (
            <Text mt="md">
              <Anchor href="/admin/login?callbackUrl=/games/uno-tracker">
                Sign in
              </Anchor>{" "}
              to start a game or record rounds.
            </Text>
          )
        )}
      </section>
      {(uno.error || message) && (
        <Alert color="orange" title="Scores need attention" role="alert">
          {message || uno.error}
        </Alert>
      )}
      {attention.map((event) => (
        <Paper withBorder p="sm" key={event.id}>
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
      <Modal
        opened={!!confirmation}
        onClose={() => {
          if (!busy) setConfirmation(null);
        }}
        title="Finish this game?"
        closeButtonProps={{ "aria-label": "Close finish confirmation" }}
        centered
      >
        {confirmation && (
          <>
            <Text>
              Cam {confirmation.cam} · Laura {confirmation.laura}
            </Text>
            <Text>
              {confirmation.cam + confirmation.laura} rounds ·{" "}
              {result(confirmation).winner === "draw"
                ? "Draw"
                : `${names[result(confirmation).winner as "cam" | "laura"]} winning`}
            </Text>
            <Text size="sm" mt="sm">
              Previously offline rounds can still arrive and amend this result.
            </Text>
            {message && (
              <Alert color="orange" mt="sm">
                {message}
              </Alert>
            )}
            <Group mt="md">
              <Button
                variant="default"
                disabled={busy}
                onClick={() => {
                  setConfirmation(null);
                }}
              >
                Keep playing
              </Button>
              <Button
                disabled={!uno.online || pending > 0}
                loading={busy}
                onClick={() => {
                  void act(async () => {
                    const finished = await uno.finish(confirmation);
                    if (finished) {
                      setConfirmation(null);
                      setMessage("");
                    } else {
                      const latest = unoController.getSnapshot().data.state;
                      setConfirmation(
                        latest?.games.find((g) => g.id === confirmation.id) ??
                          null,
                      );
                      setMessage(
                        "Scores changed on another device. Check the updated scores and confirm again.",
                      );
                    }
                  });
                }}
              >
                Confirm finish
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </div>
  );
}

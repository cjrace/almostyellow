"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  List,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { signInWithCustomToken } from "firebase/auth";
import {
  clientAuth,
  clientFirestore,
  type FirebaseClientConfig,
} from "@/firebase/client";
import { firestoreTokenAction } from "@/actions/firestoreTokenAction";
import { createBuzzer, controlBuzzer } from "@/actions/buzzer";
import {
  guestClient,
  reconcile,
  send,
  watchBuzzes,
  watchRoom,
  type GuestClient,
} from "@/buzzer/client";
import { leaderboard, type Buzz, type RoomView } from "@/buzzer/model";
import { playerSignInError } from "@/buzzer/errors";
import styles from "@/styles/buzzer.module.css";

export default function Buzzer({
  config,
  initialCode,
  host,
}: {
  config: FirebaseClientConfig;
  initialCode: string;
  host: boolean;
}) {
  const [client, setClient] = useState<GuestClient | null>(null);
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("");
  const [active, setActive] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [hosting, setHosting] = useState(false);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);
  const [cached, setCached] = useState(true);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [ending, setEnding] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [now, setNow] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const roomTitleRef = useRef<HTMLHeadingElement>(null);
  const rosterRef = useRef<HTMLHeadingElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const lastRoundRef = useRef("");
  const createIdRef = useRef<string | null>(null);
  const flightRef = useRef(false);
  const buzzButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let alive = true;
    // Restoring a host's room must not depend on anonymous player sign-in.
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const saved = sessionStorage.getItem("buzzer-room");
        if (saved) {
          const membership = JSON.parse(saved) as {
            code: string;
            playerId: string;
            hosting: boolean;
          };
          if (!initialCode || initialCode.toUpperCase() === membership.code) {
            setCode(membership.code);
            setActive(membership.code);
            setPlayerId(membership.playerId);
            setHosting(membership.hosting && host);
          }
        }
      } catch {
        setError("Could not restore your saved room. Reload to try again.");
      }
    });
    guestClient(config)
      .then((client) => {
        if (!alive) return;
        setClient(client);
        setIdentityError("");
      })
      .catch((error: unknown) => {
        if (alive) setIdentityError(playerSignInError(error));
      });
    const update = () => {
      setOnline(navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [config, initialCode, host]);
  useEffect(() => {
    if (!active || (!hosting && !client)) return;
    let unsubscribe: (() => void) | undefined;
    let alive = true;
    async function subscribe() {
      if (hosting) {
        await signInWithCustomToken(
          clientAuth(config),
          await firestoreTokenAction(),
        );
      }
      const db = hosting ? clientFirestore(config) : client?.db;
      if (!db || !alive) return;
      unsubscribe = watchRoom(
        db,
        active,
        (next, cached) => {
          if (lastRoundRef.current !== next.round) {
            setBuzzes([]);
            setUncertain(false);
            lastRoundRef.current = next.round;
          }
          setRoom(next);
          setCached(cached);
        },
        () => {
          setCached(true);
          setError(
            "This room is unavailable, ended, expired, or you have been removed.",
          );
        },
      );
    }
    void subscribe().catch(() => {
      setError("Could not connect to the room. Reload to try again.");
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [client, active, hosting, config]);
  useEffect(() => {
    if (!room || room.phase === "ended") return;
    const db = hosting ? clientFirestore(config) : client?.db;
    if (!db) return;
    return watchBuzzes(
      db,
      room.code,
      room.round,
      (next) => {
        if (lastRoundRef.current === room.round) setBuzzes(next);
      },
      () => {
        if (lastRoundRef.current === room.round) setBuzzes([]);
      },
    );
  }, [client, room, hosting, config]);
  function remember(
    nextCode: string,
    nextPlayer: string,
    nextHosting: boolean,
  ) {
    sessionStorage.setItem(
      "buzzer-room",
      JSON.stringify({
        code: nextCode,
        playerId: nextPlayer,
        hosting: nextHosting,
      }),
    );
    setActive(nextCode);
    setCode(nextCode);
    setPlayerId(nextPlayer);
    setHosting(nextHosting);
    requestAnimationFrame(() => {
      roomTitleRef.current?.focus();
    });
    window.history.replaceState(null, "", `?room=${nextCode}`);
  }
  async function run(operation: () => Promise<void>) {
    if (flightRef.current) return;
    flightRef.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not complete the change.",
      );
    } finally {
      flightRef.current = false;
      setBusy(false);
    }
  }
  async function join() {
    if (!client) return;
    const result = await send(client, "join", { code, name });
    remember(code, result.playerId ?? "", hosting);
  }
  const expired = !!room && room.expiresAt <= now;
  const ended = room?.phase === "ended" || expired;
  const ownBuzz = buzzes.some((buzz) => buzz.id === playerId);
  const eligible = !!room?.eligible.includes(playerId);
  const canBuzz =
    !!client &&
    !!room &&
    room.phase === "open" &&
    eligible &&
    !ownBuzz &&
    !busy &&
    !uncertain &&
    online &&
    !cached &&
    !ended;
  async function buzz() {
    if (!canBuzz) return;
    const original = room;
    setBuzzing(true);
    await run(async () => {
      try {
        await send(client, "buzz", {
          code: original.code,
          round: original.round,
          version: original.version,
          commandId: crypto.randomUUID(),
        });
      } catch {
        if (lastRoundRef.current !== original.round) return;
        setUncertain(true);
        try {
          const confirmed = await reconcile(
            client.db,
            original.code,
            original.round,
          );
          if (lastRoundRef.current !== original.round) return;
          setBuzzes(confirmed);
          setUncertain(false);
        } catch {
          if (lastRoundRef.current !== original.round) return;
          throw new Error(
            "Your buzz is unconfirmed. Reconnect and check before trying again.",
          );
        }
      }
    });
    setBuzzing(false);
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ending ||
        instructions
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input,textarea,select,button,a,[contenteditable=true],[role=dialog]",
        )
      )
        return;
      if (canBuzz) {
        event.preventDefault();
        buzzButtonRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [canBuzz, ending, instructions]);
  async function control(
    action: "open" | "close" | "reset" | "remove" | "end",
    removeId?: string,
  ) {
    if (!room || busy || cached) return;
    if (action === "open" && room.phase !== "ready") return;
    if (action === "close" && room.phase !== "open") return;
    const result = await controlBuzzer(action, {
      code: room.code,
      round: room.round,
      version: room.version,
      commandId: crypto.randomUUID(),
      playerId: removeId,
    });
    if (result?.error) throw new Error(result.error);
    if (action === "remove")
      requestAnimationFrame(() => {
        rosterRef.current?.focus();
      });
  }
  const rows = leaderboard(buzzes);
  return (
    <Container size="sm">
      <Stack gap="md">
        <Group justify="space-between">
          <Title ref={titleRef} tabIndex={-1}>
            Quiz buzzer
          </Title>
          <Button
            autoContrast
            variant="default"
            onClick={() => {
              setInstructions(true);
            }}
          >
            Instructions
          </Button>
        </Group>
        {notice && <Text role="status">{notice}</Text>}
        {identityError && (
          <Alert color="red" role="alert">
            {identityError}
            {host && " You can still create and host a room."}
          </Alert>
        )}
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        {!active && (
          <>
            <Text>Join a room on your phone or laptop. No account needed.</Text>
            <TextInput
              label="Room code"
              value={code}
              maxLength={6}
              onChange={(event) => {
                setCode(
                  event.currentTarget.value.toUpperCase().replace(/\s/g, ""),
                );
              }}
            />
            <TextInput
              label="Your name"
              value={name}
              maxLength={30}
              onChange={(event) => {
                setName(event.currentTarget.value);
              }}
            />
            <Button
              autoContrast
              disabled={!client || busy || !online}
              onClick={() => void run(join)}
            >
              Join room
            </Button>
            {host ? (
              <Button
                autoContrast
                variant="default"
                disabled={busy || !online}
                onClick={() =>
                  void run(async () => {
                    createIdRef.current ??= crypto.randomUUID();
                    const created = await createBuzzer(createIdRef.current);
                    remember(created, "", true);
                  })
                }
              >
                Create room
              </Button>
            ) : (
              <Anchor c="inherit" underline="always" href="/admin/login">
                Sign in to host a room
              </Anchor>
            )}
          </>
        )}
        {active && (
          <>
            <Title ref={roomTitleRef} tabIndex={-1} order={2}>
              Room {active}
            </Title>
            <Button
              autoContrast
              variant="default"
              onClick={() =>
                void run(async () => {
                  await navigator.clipboard.writeText(
                    `${location.origin}/games/buzzer?room=${active}`,
                  );
                  setNotice("Join link copied.");
                })
              }
            >
              Copy join link
            </Button>
            <Text role="status">
              {ended
                ? expired
                  ? "This room has expired."
                  : "This room has ended."
                : !online || cached
                  ? "Reconnecting — buzzing is unavailable."
                  : room?.phase === "open"
                    ? "Buzzing is open."
                    : room?.phase === "closed"
                      ? "Buzzing is closed."
                      : "Waiting for the host to open buzzing."}
            </Text>
            {room && !ended && (
              <>
                {hosting && (
                  <Group>
                    <Button
                      autoContrast
                      aria-disabled={busy || cached || room.phase !== "ready"}
                      data-disabled={
                        busy || cached || room.phase !== "ready" || undefined
                      }
                      onClick={() => void run(() => control("open"))}
                    >
                      Open buzzing
                    </Button>
                    <Button
                      autoContrast
                      aria-disabled={busy || cached || room.phase !== "open"}
                      data-disabled={
                        busy || cached || room.phase !== "open" || undefined
                      }
                      onClick={() => void run(() => control("close"))}
                    >
                      Close buzzing
                    </Button>
                    <Button
                      autoContrast
                      variant="default"
                      aria-disabled={busy || cached}
                      data-disabled={busy || cached || undefined}
                      onClick={() =>
                        void run(async () => {
                          await control("reset");
                          setBuzzes([]);
                          setUncertain(false);
                        })
                      }
                    >
                      Reset
                    </Button>
                    <Button
                      autoContrast
                      ref={endRef}
                      color="red"
                      variant="default"
                      onClick={() => {
                        setEnding(true);
                      }}
                    >
                      End room
                    </Button>
                  </Group>
                )}
                {!playerId && hosting && (
                  <>
                    <TextInput
                      label="Your player name"
                      value={name}
                      maxLength={30}
                      onChange={(event) => {
                        setName(event.currentTarget.value);
                      }}
                    />
                    <Button
                      autoContrast
                      disabled={busy || !client || !online}
                      onClick={() => void run(join)}
                    >
                      Join as a player
                    </Button>
                  </>
                )}
                {playerId && (
                  <>
                    <UnstyledButton
                      ref={buzzButtonRef}
                      className={styles.buzzer}
                      aria-disabled={!canBuzz}
                      data-pressed={pressed || buzzing || ownBuzz || undefined}
                      onPointerDown={() => {
                        if (canBuzz) setPressed(true);
                      }}
                      onPointerUp={() => {
                        setPressed(false);
                      }}
                      onPointerCancel={() => {
                        setPressed(false);
                      }}
                      onPointerLeave={() => {
                        setPressed(false);
                      }}
                      onKeyDown={(event) => {
                        if (
                          canBuzz &&
                          (event.code === "Space" || event.key === "Enter")
                        )
                          setPressed(true);
                      }}
                      onKeyUp={() => {
                        setPressed(false);
                      }}
                      onBlur={() => {
                        setPressed(false);
                      }}
                      onClick={() => void buzz()}
                    >
                      <span className={styles.cap}>
                        <span className={styles.label}>
                          {ownBuzz
                            ? "Buzz recorded"
                            : buzzing
                              ? "Confirming…"
                              : "Buzz!"}
                        </span>
                      </span>
                    </UnstyledButton>
                    <Text role="status">
                      {ownBuzz
                        ? `Your place: ${String(rows.find((row) => row.id === playerId)?.place ?? "pending")}.`
                        : room.phase === "open" && !eligible
                          ? "You will play from the next question."
                          : "Use the button or press Space."}
                    </Text>
                    {uncertain && (
                      <Button
                        autoContrast
                        onClick={() =>
                          void run(async () => {
                            if (client) {
                              try {
                                const confirmed = await reconcile(
                                  client.db,
                                  room.code,
                                  room.round,
                                );
                                if (lastRoundRef.current !== room.round) return;
                                setBuzzes(confirmed);
                                setUncertain(false);
                              } catch (error) {
                                if (lastRoundRef.current === room.round)
                                  throw error;
                              }
                            }
                          })
                        }
                      >
                        Check buzz
                      </Button>
                    )}
                    <Button
                      autoContrast
                      variant="default"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          if (client)
                            await send(client, "leave", {
                              code: room.code,
                              round: room.round,
                              version: room.version,
                              commandId: crypto.randomUUID(),
                            });
                          setPlayerId("");
                          if (hosting) remember(active, "", true);
                          else {
                            setActive("");
                            requestAnimationFrame(() => {
                              titleRef.current?.focus();
                            });
                            setRoom(null);
                            sessionStorage.removeItem("buzzer-room");
                            window.history.replaceState(
                              null,
                              "",
                              "/games/buzzer",
                            );
                          }
                        })
                      }
                    >
                      Leave room
                    </Button>
                  </>
                )}
                <Title order={2}>Buzz order</Title>
                <Table captionSide="top">
                  <Table.Caption c="var(--mantine-color-text)">
                    Gaps behind first place, in milliseconds
                  </Table.Caption>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Place</Table.Th>
                      <Table.Th>Player</Table.Th>
                      <Table.Th>Gap</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td>{row.place}</Table.Td>
                        <Table.Td style={{ overflowWrap: "anywhere" }}>
                          {row.name}
                        </Table.Td>
                        <Table.Td>{row.gap} ms</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                <Title ref={rosterRef} tabIndex={-1} order={2}>
                  Players ({room.players.length}/20)
                </Title>
                <List>
                  {room.players.map((player) => (
                    <List.Item
                      key={player.id}
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {player.name}{" "}
                      {hosting && (
                        <Button
                          autoContrast
                          size="compact-sm"
                          variant="default"
                          disabled={busy}
                          aria-label={`Remove ${player.name}`}
                          onClick={() =>
                            void run(() => control("remove", player.id))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </List.Item>
                  ))}
                </List>
              </>
            )}
            <Button
              autoContrast
              ref={backRef}
              variant="default"
              onClick={() => {
                setActive("");
                lastRoundRef.current = "";
                requestAnimationFrame(() => {
                  titleRef.current?.focus();
                });
                setRoom(null);
                setPlayerId("");
                setHosting(false);
                setBuzzes([]);
                createIdRef.current = null;
                sessionStorage.removeItem("buzzer-room");
                window.history.replaceState(null, "", "/games/buzzer");
              }}
            >
              Back to join screen
            </Button>
          </>
        )}
        <Modal
          opened={ending}
          onClose={() => {
            setEnding(false);
            requestAnimationFrame(() => {
              endRef.current?.focus();
            });
          }}
          title="End this room?"
          returnFocus={false}
          closeButtonProps={{ "aria-label": "Cancel ending the room" }}
        >
          <Text>Everyone will lose access to gameplay.</Text>
          <Button
            autoContrast
            color="red.9"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await control("end");
                setEnding(false);
                requestAnimationFrame(() => {
                  backRef.current?.focus();
                });
              })
            }
          >
            End room
          </Button>
        </Modal>
        <Modal
          opened={instructions}
          onClose={() => {
            setInstructions(false);
          }}
          title="Quiz buzzer instructions"
          closeButtonProps={{ "aria-label": "Close instructions" }}
        >
          <Stack>
            <Text>
              The host opens buzzing for each question. Buzz once; everyone sees
              the confirmed order. Buzzing stays open until the host closes it.
              Reset prepares the next question.
            </Text>
            <Text>
              Players joining an open question wait for the next one. Exactly
              equal recorded times share a place. Network and processing delays
              can affect close finishes.
            </Text>
            <Text>
              Stay connected: buzzes are never queued offline. Refresh restores
              your place in this browser; deleting browser storage loses your
              identity. Rooms last six hours.
            </Text>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}

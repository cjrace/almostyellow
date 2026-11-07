"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMounted } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Button,
  Center,
  Container,
  Group,
  List,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
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
  joinGuest,
  reconcile,
  send,
  watchBuzzes,
  watchRoom,
  type GuestClient,
} from "@/buzzer/client";
import { leaderboard, ordinal, type Buzz, type RoomView } from "@/buzzer/model";
import { vibrate } from "@/haptics";
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
  const [joinView, setJoinView] = useState<"choose" | "code" | "invite">(
    initialCode ? "invite" : "choose",
  );
  const [active, setActive] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [hosting, setHosting] = useState(false);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);
  const [cached, setCached] = useState(true);
  // The room the server has confirmed, so the first connection is not reported
  // as a lost one.
  const [syncedRoom, setSyncedRoom] = useState("");
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
  const mounted = useMounted();
  const [now, setNow] = useState(0);
  const router = useRouter();
  const roomTitleRef = useRef<HTMLHeadingElement>(null);
  const rosterRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);
  const leaveRef = useRef<HTMLButtonElement>(null);
  const lastRoundRef = useRef("");
  const createIdRef = useRef<string | null>(null);
  const flightRef = useRef(false);
  const buzzButtonRef = useRef<HTMLButtonElement>(null);
  const joinChoiceRef = useRef<HTMLButtonElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    // Restoring a host's room must not depend on player sign-in.
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
            setJoinView("invite");
            setActive(membership.code);
            setPlayerId(membership.playerId);
            setHosting(membership.hosting && host);
          }
        }
      } catch {
        setError("Could not restore your saved room. Reload to try again.");
      }
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
    if (!active || !playerId) return;
    let alive = true;
    void guestClient(config, active)
      .then((client) => {
        if (!client.auth.currentUser) {
          if (alive) {
            setPlayerId("");
            if (!hosting) setActive("");
            setIdentityError(
              "Could not restore your player identity. Join the room again.",
            );
          }
          return;
        }
        if (alive) {
          setClient(client);
          setIdentityError("");
        }
      })
      .catch((error: unknown) => {
        if (alive) setIdentityError(playerSignInError(error));
      });
    return () => {
      alive = false;
    };
  }, [config, active, playerId, hosting]);
  useEffect(() => {
    if (!active || (!hosting && client?.code !== active)) return;
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
          if (!cached) setSyncedRoom(active);
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
  useEffect(() => {
    if (!active && joinView === "invite") nameInputRef.current?.focus();
  }, [active, joinView]);
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
    const result = await joinGuest(config, code, name);
    setClient(result.client);
    setIdentityError("");
    remember(code, result.playerId, hosting);
  }
  async function leave() {
    if (client && room && playerId && room.phase !== "ended") {
      try {
        await send(client, "leave", {
          code: room.code,
          round: room.round,
          version: room.version,
          commandId: crypto.randomUUID(),
        });
      } catch {
        // Leaving must always work. An unreleased seat is freed when the room
        // expires, or the host can remove it.
      }
    }
    // A host keeps the room so they can come back to it in this tab.
    if (hosting) {
      sessionStorage.setItem(
        "buzzer-room",
        JSON.stringify({ code: active, playerId: "", hosting: true }),
      );
    } else {
      sessionStorage.removeItem("buzzer-room");
    }
    router.push("/games");
  }
  const expired = !!room && room.expiresAt <= now;
  const ended = room?.phase === "ended" || expired;
  const ownBuzz = buzzes.some((buzz) => buzz.id === playerId);
  const connecting = syncedRoom !== active && cached && online;
  const canBuzz =
    !!client &&
    !!room &&
    room.players.some((player) => player.id === playerId) &&
    !ownBuzz &&
    !busy &&
    !uncertain &&
    online &&
    !cached &&
    !ended;
  async function buzz() {
    if (!canBuzz) return;
    vibrate(60);
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
    action: "reset" | "remove" | "end",
    removeId?: string,
  ) {
    if (!room || busy || cached) return;
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
  const ownRow = rows.find((row) => row.id === playerId);
  return (
    <Container size="sm">
      <Stack gap="md">
        <Group gap="xs">
          <Title
            fz={{
              base: "var(--mantine-h2-font-size)",
              sm: "var(--mantine-h1-font-size)",
            }}
          >
            Quiz buzzer
          </Title>
          <Tooltip
            label="Game instructions"
            openDelay={250}
            position="right"
            offset={5}
          >
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Open game instructions modal"
              onClick={(event) => {
                event.currentTarget.focus();
                setInstructions(true);
              }}
            >
              <IconInfoCircle />
            </ActionIcon>
          </Tooltip>
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
        {!active && joinView === "choose" && (
          <Stack gap="sm">
            {host ? (
              <Button
                disabled={busy || !online}
                loading={busy}
                onClick={() =>
                  void run(async () => {
                    createIdRef.current ??= crypto.randomUUID();
                    const created = await createBuzzer(createIdRef.current);
                    remember(created, "", true);
                  })
                }
              >
                Create a room
              </Button>
            ) : (
              <Button
                component={Link}
                href="/admin/login?callbackUrl=%2Fgames%2Fbuzzer"
              >
                Create a room
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              ref={joinChoiceRef}
              disabled={busy}
              onClick={() => {
                setJoinView("code");
                setError("");
                requestAnimationFrame(() => {
                  codeInputRef.current?.focus();
                });
              }}
            >
              Join with a code
            </Button>
          </Stack>
        )}
        {!active && joinView !== "choose" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(join);
            }}
          >
            <Stack gap="sm">
              <Title order={2}>
                {joinView === "invite" ? `Join room ${code}` : "Join a room"}
              </Title>
              {joinView === "code" && (
                <TextInput
                  ref={codeInputRef}
                  label="Room code"
                  placeholder="e.g. K7M4"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={code}
                  maxLength={4}
                  onChange={(event) => {
                    setCode(
                      event.currentTarget.value
                        .toUpperCase()
                        .replace(/\s/g, ""),
                    );
                  }}
                />
              )}
              <TextInput
                ref={nameInputRef}
                label="Your name"
                value={name}
                maxLength={30}
                onChange={(event) => {
                  setName(event.currentTarget.value);
                }}
              />
              <Button type="submit" disabled={busy || !online}>
                Join room
              </Button>
              {joinView === "code" && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setJoinView("choose");
                    setError("");
                    setIdentityError("");
                    window.history.replaceState(null, "", "/games/buzzer");
                    requestAnimationFrame(() => {
                      joinChoiceRef.current?.focus();
                    });
                  }}
                >
                  Back
                </Button>
              )}
            </Stack>
          </form>
        )}
        {active && (
          <>
            <Title ref={roomTitleRef} tabIndex={-1} order={2}>
              Room {active}
            </Title>
            {hosting && room && !ended && (
              <Group gap="xs">
                <Button
                  size="sm"
                  aria-disabled={busy || cached}
                  data-disabled={busy || cached || undefined}
                  onClick={() => void run(() => control("reset"))}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
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
                <Button
                  size="sm"
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
            {room && !ended && playerId && (
              <UnstyledButton
                ref={buzzButtonRef}
                className={styles.buzzer}
                aria-disabled={!canBuzz}
                aria-keyshortcuts="Space"
                data-pressed={pressed || buzzing || ownBuzz || undefined}
                data-unavailable={
                  ownBuzz ||
                  (!buzzing &&
                    (!online || (cached && !connecting) || uncertain)) ||
                  undefined
                }
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
            )}
            <Text role="status" ta="center">
              {ended
                ? expired
                  ? "This room has expired."
                  : "This room has ended."
                : connecting
                  ? "Connecting…"
                  : !online || cached
                    ? "Reconnecting — buzzing is unavailable."
                    : ownRow
                      ? `You're ${ordinal(ownRow.place)}${ownRow.gap > 0 ? `, ${String(ownRow.gap)} ms behind first` : ""}.`
                      : ownBuzz
                        ? "Buzz recorded."
                        : ""}
            </Text>
            {room && !ended && playerId && !ownBuzz && (
              <Text visibleFrom="sm" c="dimmed" size="sm" ta="center">
                Press Space to buzz.
              </Text>
            )}
            {room && !ended && uncertain && (
              <Button
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
                        if (lastRoundRef.current === room.round) throw error;
                      }
                    }
                  })
                }
              >
                Check buzz
              </Button>
            )}
            {room && !ended && (
              <>
                {rows.length > 0 ? (
                  <>
                    <Title order={2}>Buzz order</Title>
                    <List
                      role="list"
                      aria-label="Buzz order"
                      listStyleType="none"
                      spacing="xs"
                    >
                      {rows.map((row) => (
                        <List.Item
                          key={row.id}
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {row.place}. {row.name}
                          {row.id === playerId && " (you)"}
                          {row.gap > 0 && (
                            <Text span c="dimmed">
                              {" "}
                              — {row.gap} ms behind
                            </Text>
                          )}
                        </List.Item>
                      ))}
                    </List>
                  </>
                ) : (
                  hosting && <Text c="dimmed">Waiting for the first buzz.</Text>
                )}
                {!playerId && hosting && (
                  <Group align="flex-end" wrap="nowrap">
                    <TextInput
                      style={{ flex: 1 }}
                      label="Your player name"
                      value={name}
                      maxLength={30}
                      onChange={(event) => {
                        setName(event.currentTarget.value);
                      }}
                    />
                    <Button
                      disabled={busy || !online}
                      onClick={() => void run(join)}
                    >
                      Join as a player
                    </Button>
                  </Group>
                )}
                <Accordion variant="default">
                  <Accordion.Item value="players">
                    <Accordion.Control ref={rosterRef}>
                      Players ({room.players.length}/20)
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List listStyleType="none" spacing="xs">
                        {room.players.map((player) => (
                          <List.Item
                            key={player.id}
                            style={{ overflowWrap: "anywhere" }}
                          >
                            {player.name}
                            {hosting && (
                              <>
                                {" "}
                                <Button
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
                              </>
                            )}
                          </List.Item>
                        ))}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </>
            )}
            <Button
              ref={leaveRef}
              variant="default"
              disabled={busy}
              onClick={() => void run(leave)}
            >
              Leave game
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
          <Stack gap="md" align="flex-start" pt="xs">
            <Text>Everyone will lose access to gameplay.</Text>
            <Button
              color="red.9"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await control("end");
                  setEnding(false);
                  requestAnimationFrame(() => {
                    leaveRef.current?.focus();
                  });
                })
              }
            >
              End room
            </Button>
          </Stack>
        </Modal>
        <Modal.Root
          keepMounted
          withinPortal={mounted}
          keepMountedMode={mounted ? "activity" : "display-none"}
          size="auto"
          opened={instructions}
          onClose={() => {
            setInstructions(false);
          }}
          transitionProps={{
            transition: "fade",
            duration: 300,
            timingFunction: "linear",
          }}
        >
          <Modal.Overlay backgroundOpacity={0.75} blur={3} />
          <Modal.Content>
            <Modal.Body>
              <Container>
                <Modal.Title fz="h2" fw={700} lh="h2" mb="sm">
                  Quiz buzzer instructions
                </Modal.Title>
                <Stack>
                  <Text>
                    Buzz once per question. Everyone sees the confirmed order,
                    and the host resets for the next question.
                  </Text>
                  <Text>
                    Exactly equal times share a place. Network and processing
                    delays can affect close finishes.
                  </Text>
                  <Text>
                    Stay connected: buzzes are never queued offline. Refreshing
                    keeps your place in this browser. Rooms last six hours.
                  </Text>
                </Stack>
                <Center>
                  <Button
                    variant="subtle"
                    mt="md"
                    onClick={() => {
                      setInstructions(false);
                    }}
                  >
                    Close instructions modal
                  </Button>
                </Center>
              </Container>
            </Modal.Body>
          </Modal.Content>
        </Modal.Root>
      </Stack>
    </Container>
  );
}

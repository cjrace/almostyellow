"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconChevronDown, IconInfoCircle } from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  List,
  Menu,
  Modal,
  NativeSelect,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import type { FirebaseClientConfig } from "@/firebase/client";
import { controlUno, createUnoRoom, saveUnoToTracker } from "@/actions/unoroom";
import {
  guestClient,
  joinGuest,
  send,
  type GuestClient,
} from "@/buzzer/client";
import { playerSignInError } from "@/buzzer/errors";
import { announceEvents } from "@/unogame/announce";
import { sendUno, watchUnoHand, watchUnoRoom } from "@/unogame/client";
import type { Colour } from "@/unogame/engine/cards";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/unogame/engine/round";
import type { UnoHand, UnoRoom } from "@/unogame/room";
import UnoTable from "@/components/unotable";
import UnoScoreboard from "@/components/unoscoreboard";
import layout from "@/styles/cardgame.module.css";
import table from "@/styles/unotable.module.css";

const STORAGE_KEY = "uno-room";

interface Saved {
  code: string;
  playerId: string;
  hosting: boolean;
}

// The online game: joining, the lobby and the table. The server decides
// everything; this shows what it publishes and sends what the player chooses.
export default function Uno({
  config,
  initialCode,
  host,
}: {
  config: FirebaseClientConfig;
  initialCode: string;
  host: boolean;
}) {
  const router = useRouter();
  // Whether this browser can hand an invite to the phone's share sheet
  const canShare = useSyncExternalStore(
    () => () => undefined,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("");
  const [joinView, setJoinView] = useState<"choose" | "code" | "invite">(
    initialCode ? "invite" : "choose",
  );
  const [active, setActive] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [hosting, setHosting] = useState(false);
  const [client, setClient] = useState<GuestClient | null>(null);
  const [room, setRoom] = useState<UnoRoom | null>(null);
  const [hand, setHand] = useState<UnoHand | null>(null);
  const [cached, setCached] = useState(true);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [notice, setNotice] = useState("");
  const [ending, setEnding] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [camId, setCamId] = useState("");
  const [playedOn, setPlayedOn] = useState("");
  const [instructions, setInstructions] = useState(false);
  const [now, setNow] = useState(0);
  const flightRef = useRef(false);
  const createIdRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);
  const leaveRef = useRef<HTMLButtonElement>(null);
  const roundRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLAnchorElement>(null);
  const [focusHistory, setFocusHistory] = useState(false);

  // Restore this tab's room after a reload
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const membership = JSON.parse(saved) as Saved;
        if (initialCode && initialCode.toUpperCase() !== membership.code)
          return;
        setCode(membership.code);
        setJoinView("invite");
        setActive(membership.code);
        setPlayerId(membership.playerId);
        setHosting(membership.hosting && host);
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
      clearInterval(timer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [initialCode, host]);

  // The browser keeps the player's sign-in between reloads
  useEffect(() => {
    if (!active || !playerId) return;
    let alive = true;
    void guestClient(config, active, "uno")
      .then((next) => {
        if (!alive) return;
        if (!next.auth.currentUser) {
          setPlayerId("");
          if (!hosting) setActive("");
          setIdentityError(
            "Could not restore your player identity. Join the room again.",
          );
          return;
        }
        setClient(next);
        setIdentityError("");
      })
      .catch((failure: unknown) => {
        if (alive) setIdentityError(playerSignInError(failure));
      });
    return () => {
      alive = false;
    };
  }, [config, active, playerId, hosting]);

  useEffect(() => {
    if (!client || !active || client.code !== active) return;
    return watchUnoRoom(
      client.db,
      active,
      (next, fromCache) => {
        setRoom(next);
        setCached(fromCache);
      },
      () => {
        setCached(true);
        setError(
          "This room is unavailable, ended, expired, or you have been removed.",
        );
      },
    );
  }, [client, active]);

  const seated = !!room && room.seats.includes(playerId);
  // The Security Rules refuse a read of a hand that does not exist yet, which
  // would end the listener, so it starts once the player has a seat
  useEffect(() => {
    if (!client || !active || !playerId || !seated || client.code !== active)
      return;
    return watchUnoHand(client.db, active, playerId, setHand, () => {
      // Hands stop being readable when the room ends or the player leaves
      setHand(null);
    });
  }, [client, active, playerId, seated]);

  const trackerSaved = !!room?.trackerGameId;
  useEffect(() => {
    if (!trackerSaved || !focusHistory) return;
    // After the closing modal has finished handing focus back
    const frame = requestAnimationFrame(() => {
      historyRef.current?.focus();
      setFocusHistory(false);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [trackerSaved, focusHistory]);

  const expired = !!room && room.expiresAt <= now;
  const ended = room?.phase === "ended" || expired;
  const connected = online && !cached && !ended;
  const announcement = useMemo(() => {
    if (!room?.view || !playerId) return "";
    const events = announceEvents(room.events, room.names, playerId);
    const view = room.view;
    const turn =
      view.phase !== "playing"
        ? ""
        : view.currentPlayer === playerId
          ? "It is your turn."
          : `It is ${room.names[view.currentPlayer] ?? "another player"}'s turn.`;
    return [events || (room.version <= 1 ? "The round has started." : ""), turn]
      .filter(Boolean)
      .join(" ");
  }, [room, playerId]);

  function remember(next: Saved) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActive(next.code);
    setCode(next.code);
    setPlayerId(next.playerId);
    setHosting(next.hosting);
    window.history.replaceState(null, "", `?room=${next.code}`);
    requestAnimationFrame(() => {
      titleRef.current?.focus();
    });
  }

  async function run(operation: () => Promise<void>) {
    if (flightRef.current) return;
    flightRef.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not complete the change.",
      );
    } finally {
      flightRef.current = false;
      setBusy(false);
    }
  }

  async function join() {
    const result = await joinGuest(config, code, name, "uno");
    setClient(result.client);
    setIdentityError("");
    remember({ code, playerId: result.playerId, hosting });
  }

  async function play(
    action: "play" | "draw" | "keep" | "catch" | "sayUno",
    extra: Record<string, unknown> = {},
  ) {
    if (!client || !room) return;
    if (!connected) {
      setError("Reconnecting. Moves are unavailable until you are back.");
      return;
    }
    await run(() =>
      sendUno(client, action, {
        code: room.code,
        round: room.round,
        // Catching names no one, so it says which table it was made against
        ...(action === "catch" ? { version: room.version } : {}),
        ...extra,
      }),
    );
  }

  async function control(
    action: "start" | "remove" | "end" | "abandon",
    removeId?: string,
  ) {
    if (!room || !connected) return;
    const result = await controlUno(action, {
      code: room.code,
      round: room.round,
      version: room.version,
      commandId: crypto.randomUUID(),
      playerId: removeId,
    });
    if (result?.error) throw new Error(result.error);
  }

  async function leave() {
    if (client && room && playerId && !ended) {
      try {
        await send(
          client,
          "leave",
          {
            code: room.code,
            round: room.round,
            commandId: crypto.randomUUID(),
          },
          "uno",
        );
      } catch {
        // Nothing must trap the player in the room
      }
    }
    sessionStorage.removeItem(STORAGE_KEY);
    router.push("/games");
  }

  const inRound = room?.stage === "playing" && seated;
  const tableShown = !!room?.view && inRound && !ended;
  const players = room?.players ?? [];
  // Two players with a round won between them can be saved to the tracker
  const savable =
    hosting &&
    room?.stage === "finished" &&
    players.length === 2 &&
    players.some((p) => (room.scores[p.id] ?? 0) > 0);

  async function saveToTracker() {
    if (!room || !connected) return;
    const result = await saveUnoToTracker({
      code: room.code,
      round: room.round,
      version: room.version,
      camPlayerId: camId,
      playedOn,
    });
    if (result?.error) throw new Error(result.error);
    setSaving(false);
    // The link appears once the room reports the save, which may be first
    setFocusHistory(true);
  }

  // While the table shows, the host's room buttons fold into one menu, to
  // leave room for the cards
  const compactRoom = tableShown && hosting && !ended;
  const shareInvite = () => {
    void navigator
      .share({
        title: "Join my game of Uno",
        url: `${location.origin}/games/uno?room=${active}`,
      })
      .catch(() => {
        // Cancelling the share sheet is not an error
      });
  };
  const copyLink = () =>
    void run(async () => {
      await navigator.clipboard.writeText(
        `${location.origin}/games/uno?room=${active}`,
      );
      setNotice("Join link copied.");
    });
  const askEndRound = () => {
    setAbandoning(true);
  };
  const askEndRoom = () => {
    setEnding(true);
  };
  const askLeave = () => {
    if (inRound || (hosting && room && !ended)) setLeaving(true);
    else void run(leave);
  };

  return (
    <Container
      size={tableShown ? "md" : "sm"}
      w="100%"
      className={tableShown ? table.page : undefined}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      <Stack gap="md" className={tableShown ? table.pageHead : undefined}>
        <Group gap="xs">
          <Title
            fz={
              tableShown
                ? "var(--mantine-h4-font-size)"
                : {
                    base: "var(--mantine-h2-font-size)",
                    sm: "var(--mantine-h1-font-size)",
                  }
            }
          >
            Uno
          </Title>
          <Tooltip label="Game instructions" openDelay={250} position="right">
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Open game instructions modal"
              onClick={() => {
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
                    const created = await createUnoRoom(createIdRef.current);
                    createIdRef.current = null;
                    remember({ code: created, playerId: "", hosting: true });
                    setCode(created);
                    requestAnimationFrame(() => {
                      nameRef.current?.focus();
                    });
                  })
                }
              >
                Create a room
              </Button>
            ) : (
              <Button
                component={Link}
                href="/admin/login?callbackUrl=%2Fgames%2Funo"
              >
                Create a room
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => {
                setJoinView("code");
                setError("");
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
                    window.history.replaceState(null, "", "/games/uno");
                  }}
                >
                  Back
                </Button>
              )}
            </Stack>
          </form>
        )}

        {active && (
          <Group
            justify="space-between"
            align="center"
            wrap="wrap"
            className={tableShown ? table.roomRow : undefined}
          >
            <Title ref={titleRef} tabIndex={-1} order={2} size="h3">
              Room {active}
            </Title>
            {compactRoom ? (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Button
                    size="compact-sm"
                    variant="default"
                    aria-label="Room options"
                    rightSection={<IconChevronDown size={14} />}
                    ref={(button) => {
                      // Whichever dialog the menu opens, focus comes back here
                      roundRef.current = button;
                      endRef.current = button;
                      leaveRef.current = button;
                    }}
                  >
                    Room
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={copyLink}>Copy join link</Menu.Item>
                  {room.stage === "playing" && (
                    <Menu.Item onClick={askEndRound}>End round</Menu.Item>
                  )}
                  <Menu.Item color="red" onClick={askEndRoom}>
                    End room
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item disabled={busy} onClick={askLeave}>
                    Leave game
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Group gap="xs">
                {hosting && room && !ended && (
                  <>
                    <Button
                      size="compact-sm"
                      variant="default"
                      onClick={copyLink}
                    >
                      Copy join link
                    </Button>
                    {room.stage === "playing" && (
                      <Button
                        size="compact-sm"
                        ref={roundRef}
                        variant="default"
                        onClick={askEndRound}
                      >
                        End round
                      </Button>
                    )}
                    <Button
                      size="compact-sm"
                      ref={endRef}
                      color="red"
                      variant="default"
                      onClick={askEndRoom}
                    >
                      End room
                    </Button>
                  </>
                )}
                <Button
                  size="compact-sm"
                  variant="default"
                  ref={leaveRef}
                  disabled={busy}
                  onClick={askLeave}
                >
                  Leave game
                </Button>
              </Group>
            )}
          </Group>
        )}

        {active && !playerId && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(join);
            }}
          >
            <Group align="flex-end" wrap="nowrap">
              <TextInput
                ref={nameRef}
                style={{ flex: 1 }}
                label="Your player name"
                value={name}
                maxLength={30}
                onChange={(event) => {
                  setName(event.currentTarget.value);
                }}
              />
              <Button type="submit" disabled={busy || !online}>
                Join as a player
              </Button>
            </Group>
          </form>
        )}

        {ended && (
          <Text role="status">
            {expired ? "This room has expired." : "This room has ended."}
          </Text>
        )}
        {active && playerId && !ended && (!online || cached) && (
          <Text role="status">Reconnecting. Moves are unavailable.</Text>
        )}

        {room && !ended && room.stage !== "playing" && playerId && (
          <Stack gap="sm">
            <Title order={3}>
              {room.stage === "lobby" ? "Waiting to start" : "Round over"}
            </Title>
            {room.stage === "lobby" && (
              <Stack gap={4} align="flex-start">
                <Text size="sm" c="dimmed">
                  Room code, to read out or share
                </Text>
                {/* The same code is in the heading above, so this is for the
                    eyes only */}
                <Text className={table.bigCode} aria-hidden="true">
                  {active}
                </Text>
                {canShare && (
                  <Button variant="default" onClick={shareInvite}>
                    Share invite
                  </Button>
                )}
              </Stack>
            )}
            {room.stage === "finished" && room.view?.outcome && (
              <Text role="status">
                {room.view.outcome.type === "win"
                  ? `${room.names[room.view.outcome.winner] ?? "A player"} won the round.`
                  : room.view.outcome.type === "abandoned"
                    ? "The host ended the round."
                    : "Nobody could move, so nobody won."}
              </Text>
            )}
            {hosting ? (
              <Button
                disabled={
                  busy ||
                  !connected ||
                  players.length < MIN_PLAYERS ||
                  players.length > MAX_PLAYERS
                }
                aria-describedby="uno_start_reason"
                onClick={() => void run(() => control("start"))}
              >
                {room.stage === "lobby" ? "Start the round" : "Play again"}
              </Button>
            ) : (
              <Text>Waiting for the host to start the round.</Text>
            )}
            {savable &&
              (room.trackerGameId ? (
                <Group gap="xs">
                  <Button variant="default" disabled>
                    Saved to tracker
                  </Button>
                  <Anchor
                    component={Link}
                    href="/games/uno-tracker/history"
                    ref={historyRef}
                  >
                    View in tracker history
                  </Anchor>
                </Group>
              ) : (
                <Button
                  ref={saveRef}
                  variant="default"
                  disabled={busy || !connected}
                  onClick={() => {
                    setCamId(players[0].id);
                    setPlayedOn(new Date().toLocaleDateString("en-CA"));
                    setSaving(true);
                  }}
                >
                  Save to tracker
                </Button>
              ))}
            {hosting && (
              <Text id="uno_start_reason" size="sm" c="dimmed">
                {players.length < MIN_PLAYERS
                  ? `Wait for at least ${String(MIN_PLAYERS)} players.`
                  : `${String(players.length)} players are ready.`}
              </Text>
            )}
            <Title order={3} size="h4">
              Players ({players.length}/{MAX_PLAYERS})
            </Title>
            <List listStyleType="none" spacing="xs" aria-label="Players">
              {players.map((player) => (
                <List.Item key={player.id} style={{ overflowWrap: "anywhere" }}>
                  {player.name}
                  {player.id === playerId && " (you)"}
                  {hosting && player.id !== playerId && (
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
            {room.stage === "finished" && (
              <UnoScoreboard
                players={room.seats.map((id) => ({
                  id,
                  name: room.names[id] ?? "A player",
                  wins: room.scores[id] ?? 0,
                }))}
              />
            )}
          </Stack>
        )}

        {room && !ended && room.stage === "playing" && playerId && !seated && (
          <Text>A round is being played. You will join the next one.</Text>
        )}
      </Stack>

      {tableShown && room.view && (
        <div className={`${layout.game} ${table.stage}`}>
          {hand?.round === room.round ? (
            <UnoTable
              view={room.view}
              mine={hand}
              me={playerId}
              names={room.names}
              scores={room.scores}
              announcement={announcement}
              onPlay={(cardId, colour: Colour | undefined, declareUno) => {
                void play("play", {
                  cardId,
                  ...(colour ? { colour } : {}),
                  ...(declareUno ? { declareUno: true } : {}),
                });
              }}
              onDraw={() => void play("draw")}
              onKeep={() => void play("keep")}
              onCatch={() => void play("catch")}
              onSayUno={() => void play("sayUno")}
            />
          ) : (
            <Text role="status">Dealing the cards…</Text>
          )}
        </div>
      )}

      <Modal
        opened={leaving}
        onClose={() => {
          setLeaving(false);
          requestAnimationFrame(() => {
            leaveRef.current?.focus();
          });
        }}
        title={inRound ? "Leave this round?" : "Leave the room?"}
        returnFocus={false}
        closeButtonProps={{ "aria-label": "Stay in the game" }}
      >
        <Stack gap="md" align="flex-start" pt="xs">
          {inRound && (
            <Text>
              Your cards go back into the draw pile and the round carries on
              without you. You can join again for the next round.
            </Text>
          )}
          {hosting && (
            <Text>
              You host this room. If you leave, nobody can end the round or the
              room, and you will not get the host controls back. Use End room to
              finish the game for everyone instead.
            </Text>
          )}
          <Button
            color="red.9"
            disabled={busy}
            onClick={() => {
              setLeaving(false);
              void run(leave);
            }}
          >
            Leave game
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={saving}
        onClose={() => {
          setSaving(false);
          requestAnimationFrame(() => {
            saveRef.current?.focus();
          });
        }}
        title="Save to the Uno tracker?"
        returnFocus={false}
        closeButtonProps={{ "aria-label": "Do not save to the tracker" }}
      >
        <Stack gap="md" align="stretch" pt="xs">
          <Text>
            This adds this room&apos;s score as one finished game to the Cam and
            Laura tracker. You can only save a room once.
          </Text>
          <NativeSelect
            label="Who is Cam?"
            description="The other player is Laura."
            value={camId}
            data={players.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(event) => {
              setCamId(event.currentTarget.value);
            }}
          />
          <Text role="status">
            {players
              .map(
                (p) =>
                  `${p.name} ${p.id === camId ? "(Cam)" : "(Laura)"}: ${String(room?.scores[p.id] ?? 0)}`,
              )
              .join(", ")}
          </Text>
          <TextInput
            type="date"
            label="Date played"
            value={playedOn}
            required
            onChange={(event) => {
              setPlayedOn(event.currentTarget.value);
            }}
          />
          <Button
            disabled={busy || !connected || !playedOn}
            onClick={() => void run(saveToTracker)}
          >
            Save to tracker
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={abandoning}
        onClose={() => {
          setAbandoning(false);
          requestAnimationFrame(() => {
            roundRef.current?.focus();
          });
        }}
        title="End this round?"
        returnFocus={false}
        closeButtonProps={{ "aria-label": "Keep playing" }}
      >
        <Stack gap="md" align="flex-start" pt="xs">
          <Text>
            Nobody wins and everyone goes back to the lobby. Scores are kept.
          </Text>
          <Button
            color="red.9"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await control("abandon");
                setAbandoning(false);
              })
            }
          >
            End round
          </Button>
        </Stack>
      </Modal>
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
          <Text>Everyone will lose access to the game.</Text>
          <Button
            color="red.9"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await control("end");
                setEnding(false);
              })
            }
          >
            End room
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={instructions}
        onClose={() => {
          setInstructions(false);
        }}
        title="Uno instructions"
        closeButtonProps={{ "aria-label": "Close instructions" }}
      >
        <Stack>
          <Text>
            Play a card that matches the top card by colour, number or symbol,
            or play a wild card. If you cannot, draw a card, and play it or keep
            it. First to empty their hand wins the round.
          </Text>
          <Text>
            Say Uno when you play down to one card. If you forget, anyone can
            catch you before the next card is played, and you draw two.
          </Text>
          <Text>
            Refreshing keeps your seat in this browser. Rooms last six hours.
          </Text>
        </Stack>
      </Modal>
    </Container>
  );
}

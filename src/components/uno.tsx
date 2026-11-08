"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconCheck,
  IconChevronLeft,
  IconConfetti,
  IconCopy,
  IconDeviceGamepad2,
  IconDoorExit,
  IconHourglass,
  IconLogout,
  IconMoon,
  IconPlayerStop,
  IconSun,
} from "@tabler/icons-react";
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
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { FirebaseClientConfig } from "@/firebase/client";
import { controlUno, createUnoRoom, saveUnoToTracker } from "@/actions/unoroom";
import {
  guestClient,
  joinGuest,
  warmToken,
  send,
  type GuestClient,
} from "@/buzzer/client";
import { playerSignInError } from "@/buzzer/errors";
import { announceTable } from "@/unogame/announce";
import { sendUno, watchUnoHand, watchUnoRoom } from "@/unogame/client";
import type { Colour } from "@/unogame/engine/cards";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/unogame/engine/round";
import {
  FINAL_HOLD_MS,
  unseenPlayers,
  type UnoHand,
  type UnoRoom,
} from "@/unogame/room";
import playConfetti from "@/components/playconfetti";
import { sendingState, type Sent } from "@/unogame/sending";
import useWakeLock from "@/components/usewakelock";
import ViewportHeight from "@/components/viewportheight";
import { useUnoInstructions } from "@/components/unoinstructions";
import UnoTable from "@/components/unotable";
import UnoScoreboard from "@/components/unoscoreboard";
import UnoWinner from "@/components/unowinner";
import layout from "@/styles/cardgame.module.css";
import table from "@/styles/unotable.module.css";

const STORAGE_KEY = "uno-room";
// The clock, read when a move is sent or answered
const timestamp = () => Date.now();

interface Saved {
  code: string;
  playerId: string;
  hosting: boolean;
}

// The online game: joining, the lobby and the table. The server decides
// everything; this shows what it publishes and sends what the player chooses.
const JOIN_COPIED = "Join link copied.";
// Every item in the room menu has an icon this size
const ICON = 16;
// A phone held sideways, as in unotable.module.css and global.css
const SIDEWAYS = "(orientation: landscape) and (max-height: 500px)";

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
  // The room could not be read, as opposed to not having arrived yet
  const [gone, setGone] = useState(false);
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
  const { opened: instructions, setOpened: setInstructions } =
    useUnoInstructions();
  const [now, setNow] = useState(0);
  const flightRef = useRef(false);
  const createIdRef = useRef<string | null>(null);
  const roomRef = useRef<HTMLButtonElement>(null);
  const focusRoomRef = useRef(false);
  // Joining swaps the Room button for the way out while the lobby opens, so
  // focus is put back on the new button if it was lost
  const focusLobbyRef = useRef(false);
  // A move sent from the table that the room has not yet shown. It clears when
  // the room changes, when the command fails, or a few seconds after the
  // server answered (a repeat that changed nothing).
  const [sending, setSending] = useState<Sent | null>(null);
  // After a win the table stays up for a few seconds, so everyone sees how it
  // was won
  const [holding, setHolding] = useState(false);
  const [prevStage, setPrevStage] = useState<string | undefined>(undefined);
  const seenSentRef = useRef<string | null>(null);
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
    }, 500);
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
        // The listener has stopped, so what was last shown is no longer live.
        // The host is then offered the way out, which is not the case while the
        // room is only still loading.
        setRoom(null);
        setGone(true);
        setCached(true);
        setError(
          "This room is unavailable, ended, expired, or you have been removed.",
        );
      },
    );
  }, [client, active]);

  const sendingNow = sendingState(sending, room?.version, now);
  const seated = !!room && room.seats.includes(playerId);
  const expired = !!room && room.expiresAt <= now;
  const ended = room?.phase === "ended" || expired;
  // Listening from the lobby means the cards arrive with the deal itself,
  // rather than after the room shows a seat and a new listener starts
  const listed = !!room && room.players.some((p) => p.id === playerId);
  const handOpen = listed && !ended;
  useEffect(() => {
    if (!client || !active || !playerId || !handOpen || client.code !== active)
      return;
    return watchUnoHand(client.db, active, playerId, setHand);
  }, [client, active, playerId, handOpen]);

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

  // Once the room is shown, focus goes to its badge
  useEffect(() => {
    if (!active || !focusRoomRef.current) return;
    focusRoomRef.current = false;
    roomRef.current?.focus();
  }, [active]);

  // Notices such as "Join link copied" go after a few seconds, and when the
  // game moves on
  const stage = room?.stage;
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice("");
    }, 3000);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);
  useEffect(() => {
    queueMicrotask(() => {
      setNotice("");
    });
  }, [stage]);

  // A round won while this page was open holds the final card, then ends with
  // confetti. A reload into a finished room shows neither. The hold starts
  // while rendering, not in an effect, so the round-over page and an empty
  // table never show for even one frame first.
  if (stage !== prevStage) {
    setPrevStage(stage);
    if (
      prevStage === "playing" &&
      stage === "finished" &&
      !!playerId &&
      room?.view?.outcome?.type === "win"
    )
      setHolding(true);
  }
  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => {
      setHolding(false);
      playConfetti();
    }, FINAL_HOLD_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [holding]);

  // The sign-in token is refreshed over the network about hourly. Doing it as
  // your turn starts keeps a slow refresh out of your move.
  const myTurn =
    room?.stage === "playing" && room.view?.currentPlayer === playerId;
  useEffect(() => {
    if (client && myTurn) void warmToken(client);
  }, [client, myTurn]);

  // Once this device has shown the result, it says so, so the host can play
  // again knowing nobody missed it
  const finishedRound = room?.stage === "finished" ? room.round : null;
  const wasSeated = !!room && room.seats.includes(playerId);
  const canReport = !!client && online && !cached;
  useEffect(() => {
    if (
      !client ||
      !room ||
      !finishedRound ||
      !wasSeated ||
      !canReport ||
      holding ||
      seenSentRef.current === finishedRound
    )
      return;
    seenSentRef.current = finishedRound;
    sendUno(client, "seen", { code: room.code, round: finishedRound }).catch(
      () => {
        // The host's button opens after a short wait anyway
      },
    );
  }, [client, room, finishedRound, wasSeated, canReport, holding]);

  const connected = online && !cached && !ended;
  const reconnecting = !!active && !!playerId && !ended && (!online || cached);
  const announcement = useMemo(() => {
    if (!room?.view || !playerId) return "";
    return announceTable({ ...room, view: room.view }, playerId);
  }, [room, playerId]);

  function remember(next: Saved) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActive(next.code);
    setCode(next.code);
    setPlayerId(next.playerId);
    setHosting(next.hosting);
    window.history.replaceState(null, "", `?room=${next.code}`);
    focusRoomRef.current = true;
    focusLobbyRef.current = true;
    setGone(false);
  }

  async function run(operation: () => Promise<void>): Promise<boolean> {
    if (flightRef.current) return false;
    flightRef.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not complete the change.",
      );
      return false;
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
    const sentAt = timestamp();
    const started = { version: room.version, at: sentAt };
    setSending(started);
    const ok = await run(() =>
      sendUno(client, action, {
        code: room.code,
        round: room.round,
        // Catching names no one, so it says which table it was made against
        ...(action === "catch" ? { version: room.version } : {}),
        ...extra,
      }),
    );
    setSending((current) =>
      current?.at !== sentAt
        ? current
        : ok
          ? { ...current, answeredAt: timestamp() }
          : null,
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
    // A player who has been removed has nothing left to leave, and the room
    // would only refuse the command
    if (client && room && playerId && listed && !ended) {
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
    exit();
  }

  // Back to the games list, forgetting the room
  function exit() {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push("/games");
  }

  const inRound = room?.stage === "playing" && seated;
  // Joined and waiting for the host to start
  const inLobby = room?.stage === "lobby" && !!playerId && !ended;
  const tableShown =
    !!room?.view && seated && (room.stage === "playing" || holding) && !ended;
  const players = room?.players ?? [];
  const { setColorScheme } = useMantineColorScheme();
  const colourScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: true,
  });
  // Only a phone held sideways has the header's buttons in the room menu. They
  // are not rendered elsewhere, so the arrow keys never land on a hidden item.
  const sideways = useMediaQuery(SIDEWAYS);
  // The screen stays awake during a round, so waiting for a turn does not
  // lock the phone. Ending the room mid-round leaves the stage as it was.
  useWakeLock(inRound && !ended);
  // The Room button became the way out as the lobby opened
  useEffect(() => {
    if (!inLobby || !focusLobbyRef.current) return;
    focusLobbyRef.current = false;
    const now = document.activeElement;
    if (!now || now === document.body) leaveRef.current?.focus();
  }, [inLobby]);
  // On a phone held sideways the site's header gives its height back to the
  // table (see global.css); the page keeps its own back button and menu
  useEffect(() => {
    if (!tableShown) return;
    const root = document.documentElement;
    root.dataset.unoTable = "";
    return () => {
      delete root.dataset.unoTable;
    };
  }, [tableShown]);
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

  // Start / play again and save to tracker
  const roundActions = () => {
    if (!room) return null;
    const reasonId = "uno_start_reason";
    const unseen = unseenPlayers(room, now);
    return (
      <Stack gap="sm" className={table.bottomActions}>
        {hosting ? (
          <Stack gap="sm">
            <Group gap="xs" wrap="nowrap" align="center">
              {unseen.length > 0 || players.length < MIN_PLAYERS ? (
                <IconHourglass size={20} aria-hidden="true" />
              ) : (
                <IconCheck
                  size={20}
                  aria-hidden="true"
                  color="var(--mantine-color-teal-6)"
                />
              )}
              <Text id={reasonId} fw={600}>
                {unseen.length > 0
                  ? `Waiting for ${unseen.map((p) => p.name).join(", ")} to see who won.`
                  : players.length < MIN_PLAYERS
                    ? `Wait for at least ${String(MIN_PLAYERS)} players.`
                    : `${String(players.length)} players are ready.`}
              </Text>
            </Group>
            <Button
              disabled={
                busy ||
                !connected ||
                unseen.length > 0 ||
                players.length < MIN_PLAYERS ||
                players.length > MAX_PLAYERS
              }
              aria-describedby={reasonId}
              onClick={() => {
                void run(() => control("start"));
              }}
            >
              {room.stage === "lobby" ? "Start the round" : "Play again"}
            </Button>
          </Stack>
        ) : (
          <Text>Waiting for the host to start the round.</Text>
        )}
        {savable && (
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
            Save to tracker and end room
          </Button>
        )}
      </Stack>
    );
  };
  const copyLink = () =>
    void run(async () => {
      await navigator.clipboard.writeText(
        `${location.origin}/games/uno?room=${active}`,
      );
      setNotice(JOIN_COPIED);
    });
  const askEndRound = () => {
    setAbandoning(true);
  };
  const askEndRoom = () => {
    setEnding(true);
  };
  const askLeave = () => {
    if (inRound && !ended) setLeaving(true);
    else void run(leave);
  };

  return (
    <Container
      size={tableShown ? "md" : "sm"}
      w="100%"
      className={tableShown ? table.page : undefined}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      <ViewportHeight />
      <Stack gap="md" className={tableShown ? table.pageHead : table.fill}>
        {tableShown && (
          <>
            {/* On a phone held sideways the site's header is hidden, and these
                stand in for it. They are hidden in every other layout. */}
            <h1 className={table.landscapeTitle}>Uno</h1>
            <ActionIcon
              variant="default"
              component={Link}
              href="/games"
              aria-label="Back to our games list"
              className={table.back}
            >
              <IconChevronLeft size={16} />
              <IconDeviceGamepad2 size={18} />
            </ActionIcon>
          </>
        )}
        {/* One box, so that sideways, where the table takes the whole screen,
            they stack in the row above the strip, not on top of each other */}
        {(notice || identityError || error || reconnecting) && (
          <Stack gap="md" className={table.notices}>
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
            {reconnecting && (
              <Text role="status">Reconnecting. Moves are unavailable.</Text>
            )}
          </Stack>
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
            justify="flex-end"
            align="center"
            wrap="nowrap"
            className={tableShown ? table.roomRow : undefined}
          >
            {/* Waiting to start, the room code and link are in the invite card, so
                the menu would only hold the way out */}
            {inLobby ? (
              <Button
                size="compact-sm"
                variant={hosting ? "filled" : "default"}
                color={hosting ? "red.9" : undefined}
                disabled={busy}
                ref={(button) => {
                  endRef.current = button;
                  leaveRef.current = button;
                }}
                onClick={hosting ? askEndRoom : askLeave}
              >
                {hosting ? "End game" : "Leave game"}
              </Button>
            ) : (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Button
                    size="compact-sm"
                    variant="default"
                    aria-label={`Room ${active}, options`}
                    rightSection={<IconChevronDown size={14} />}
                    ref={(button) => {
                      // The end round, end room and leave dialogs each return focus to their
                      // own ref, so all of them point at this one button
                      roomRef.current = button;
                      roundRef.current = button;
                      endRef.current = button;
                      leaveRef.current = button;
                    }}
                  >
                    Room {active}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconCopy size={ICON} />}
                    onClick={copyLink}
                  >
                    Copy join link
                  </Menu.Item>
                  {tableShown && sideways && (
                    <>
                      {/* The header's buttons, for a phone held sideways */}
                      <Menu.Item
                        leftSection={<IconConfetti size={ICON} />}
                        onClick={playConfetti}
                      >
                        Unleash confetti
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          colourScheme === "dark" ? (
                            <IconSun size={ICON} />
                          ) : (
                            <IconMoon size={ICON} />
                          )
                        }
                        onClick={() => {
                          setColorScheme(
                            colourScheme === "light" ? "dark" : "light",
                          );
                        }}
                      >
                        {colourScheme === "dark" ? "Light" : "Dark"} mode
                      </Menu.Item>
                    </>
                  )}
                  {hosting && room && !ended && room.stage === "playing" && (
                    <Menu.Item
                      leftSection={<IconPlayerStop size={ICON} />}
                      onClick={askEndRound}
                    >
                      End round
                    </Menu.Item>
                  )}
                  {hosting && room && !ended && (
                    <Menu.Item
                      color="red"
                      leftSection={<IconDoorExit size={ICON} />}
                      onClick={askEndRoom}
                    >
                      End room
                    </Menu.Item>
                  )}
                  {/* The host never leaves without ending, so this is for everyone
                      else, and for the host once the room has ended, when there
                      is no room to end (not joined yet, or it could not be
                      read). Not while it is still loading after a reload, as
                      leaving then would abandon a live room. */}
                  {(!hosting || ended || !playerId || gone) && (
                    <>
                      <Menu.Divider />
                      <Menu.Item
                        disabled={busy}
                        leftSection={<IconLogout size={ICON} />}
                        onClick={askLeave}
                      >
                        Leave game
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
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
            {hosting && trackerSaved
              ? " The scores were saved to the tracker."
              : ""}
          </Text>
        )}
        {ended && hosting && trackerSaved && (
          <Anchor
            component={Link}
            href="/games/uno-tracker/history"
            ref={historyRef}
          >
            View in tracker history
          </Anchor>
        )}

        {room && !ended && room.stage !== "playing" && !holding && playerId && (
          <Stack gap="sm" className={table.fill}>
            <Title order={2} size="h3">
              {room.stage === "lobby" ? "Waiting to start" : "Round over"}
            </Title>
            {/* Inviting is part of waiting, so it is here to use, not in a menu */}
            {room.stage === "lobby" && (
              <Paper withBorder p="sm" radius="md">
                <Group justify="space-between" gap="sm">
                  <Stack gap={0}>
                    <Text size="sm" c="dimmed">
                      Room code
                    </Text>
                    <Text fw={700} fz="xl" style={{ letterSpacing: "0.15em" }}>
                      {room.code}
                    </Text>
                  </Stack>
                  <Button
                    variant="default"
                    disabled={busy}
                    leftSection={
                      notice === JOIN_COPIED ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconCopy size={16} />
                      )
                    }
                    onClick={copyLink}
                  >
                    {notice === JOIN_COPIED ? "Link copied" : "Copy join link"}
                  </Button>
                </Group>
              </Paper>
            )}
            {room.stage === "finished" &&
              room.view?.outcome &&
              (room.view.outcome.type === "win" ? (
                <UnoWinner
                  name={room.names[room.view.outcome.winner] ?? "A player"}
                  you={room.view.outcome.winner === playerId}
                />
              ) : (
                <Text role="status">
                  {room.view.outcome.type === "abandoned"
                    ? "The host ended the round."
                    : "Nobody could move, so nobody won."}
                </Text>
              ))}
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
            {/* The main actions are last, where they are easy to reach */}
            {roundActions()}
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
              events={room.events}
              version={room.version}
              now={now}
              turnReadyAt={room.turnReadyAt ?? 0}
              sending={sendingNow}
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
              onInstructions={() => {
                setInstructions(true);
              }}
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
            Laura tracker. You can only save a room once, and saving ends the
            room for everyone.
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
            Save and end room
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
          <Text>
            Everyone will lose access to the game, and you will leave it too.
          </Text>
          <Button
            color="red.9"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await control("end");
                setEnding(false);
                exit();
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
            or play a wild card. If you can play, you must; only if you cannot
            do you draw a card, and then play it or keep it. First to empty
            their hand wins the round.
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

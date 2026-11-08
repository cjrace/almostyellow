"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Text } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCards,
} from "@tabler/icons-react";
import styles from "@/styles/unotable.module.css";

interface Seat {
  id: string;
  name: string;
  cards: number;
}

interface UnoOpponentsProps {
  players: Seat[]; // Everyone, you included, in seat order
  me: string;
  currentPlayer: string;
  direction: 1 | -1;
  unoPlayer: string | null; // Anyone sitting on one card without saying Uno
}

// How many seats show on a phone held sideways
const SHOWN_SEATS = 3;

// Everyone in the round, in seat order, with their card count and whose turn it
// is. The turn is a filled pill with the word "Playing", and "UNO!" stays on
// anyone down to one card who has said it, so none of it depends on colour.
export default function UnoOpponents({
  players,
  me,
  currentPlayer,
  direction,
  unoPlayer,
}: UnoOpponentsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  // When there are more players than fit, the list scrolls, so the keyboard
  // needs a way into it
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      setScrolls(
        list.scrollHeight > list.clientHeight + 1 ||
          list.scrollWidth > list.clientWidth + 1,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const child of list.children) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, [players.length]);

  // When the list scrolls, keep whoever is playing in view as the turn moves
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>("[data-current]");
    if (!list || !current) return;
    // Measured against the list itself, as it is not a positioned parent
    const box = list.getBoundingClientRect();
    const at = current.getBoundingClientRect();
    const top =
      list.scrollTop + (at.top - box.top) - (box.height - at.height) / 2;
    const left =
      list.scrollLeft + (at.left - box.left) - (box.width - at.width) / 2;
    list.scrollTo({ top: Math.max(0, top), left: Math.max(0, left) });
  }, [currentPlayer, players.length]);

  // A phone held sideways has room for a few seats, so the rest become "+N".
  // You, whoever is playing and anyone who can be caught always show.
  const shown = new Set(
    [me, currentPlayer, unoPlayer].filter(
      (id): id is string => !!id && players.some((p) => p.id === id),
    ),
  );
  for (const player of players) {
    if (shown.size >= SHOWN_SEATS) break;
    shown.add(player.id);
  }
  const hidden = players.length - shown.size;

  return (
    <ul
      ref={listRef}
      className={styles.opponents}
      aria-label="Players"
      // A scrolling box needs a keyboard stop (WCAG 2.1.1) or its players
      // cannot be reached; it only gets one while it really scrolls
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
      tabIndex={scrolls ? 0 : undefined}
    >
      {players.map((player) => {
        const current = player.id === currentPlayer;
        const you = player.id === me;
        const label = you ? "You" : player.name;
        const said = player.cards === 1 && unoPlayer !== player.id;
        const cards = `${String(player.cards)} ${player.cards === 1 ? "card" : "cards"}`;
        return (
          <li
            key={player.id}
            className={styles.opponent}
            data-current={current ? "" : undefined}
            data-catch={unoPlayer === player.id ? "" : undefined}
            data-extra={shown.has(player.id) ? undefined : ""}
            aria-label={`${label}, ${cards}${current ? ", playing now" : ""}${said ? ", said Uno" : ""}${unoPlayer === player.id ? ", can be caught for Uno" : ""}`}
          >
            <Text
              fw={700}
              lineClamp={2}
              title={label}
              style={{ overflowWrap: "anywhere" }}
            >
              {label}
            </Text>
            <Group gap="0 xs" justify="space-between" aria-hidden="true">
              <Group gap={6} wrap="nowrap">
                {/* A few card backs stand for the hand when the seats sit
                    along the top of a phone held sideways */}
                <span
                  className={styles.backs}
                  data-count={Math.min(player.cards, 3)}
                >
                  <i />
                  <i />
                  <i />
                </span>
                <IconCards size={18} className={styles.cardsIcon} />
                <Text>
                  {player.cards}
                  <span className={styles.unit}>
                    {player.cards === 1 ? " card" : " cards"}
                  </span>
                </Text>
              </Group>
              <Text
                size="sm"
                fw={said || current ? 700 : undefined}
                className={
                  current || said || unoPlayer === player.id
                    ? styles.status
                    : styles.waiting
                }
              >
                {current && (
                  <span className={styles.direction}>
                    {direction === 1 ? (
                      <IconArrowForwardUp size={14} />
                    ) : (
                      <IconArrowBackUp size={14} />
                    )}
                  </span>
                )}
                {current
                  ? "Playing"
                  : unoPlayer === player.id
                    ? "Uno?"
                    : said
                      ? "UNO!"
                      : "Waiting"}
              </Text>
            </Group>
          </li>
        );
      })}
      {hidden > 0 ? (
        <li
          className={styles.more}
          aria-hidden="true"
          title={`${String(hidden)} more ${hidden === 1 ? "player" : "players"}`}
        >
          +{hidden}
        </li>
      ) : null}
    </ul>
  );
}

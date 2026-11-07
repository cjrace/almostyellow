"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Text } from "@mantine/core";
import { IconCards } from "@tabler/icons-react";
import styles from "@/styles/unotable.module.css";

interface Opponent {
  id: string;
  name: string;
  cards: number;
}

interface UnoOpponentsProps {
  players: Opponent[]; // In turn order, starting after you
  currentPlayer: string;
  unoPlayer: string | null; // Anyone sitting on one card without saying Uno
}

// Who else is playing, how many cards they hold and whose turn it is. The
// count and "Playing" are words, so none of it depends on colour.
export default function UnoOpponents({
  players,
  currentPlayer,
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

  return (
    <ul
      ref={listRef}
      className={styles.opponents}
      aria-label="Other players"
      // A scrolling box needs a keyboard stop (WCAG 2.1.1) or its players
      // cannot be reached; it only gets one while it really scrolls
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
      tabIndex={scrolls ? 0 : undefined}
    >
      {players.map((player) => {
        const current = player.id === currentPlayer;
        const cards = `${String(player.cards)} ${player.cards === 1 ? "card" : "cards"}`;
        return (
          <li
            key={player.id}
            className={styles.opponent}
            data-current={current ? "" : undefined}
            aria-label={`${player.name}, ${cards}${current ? ", playing now" : ""}${unoPlayer === player.id ? ", can be caught for Uno" : ""}`}
          >
            <Text
              fw={700}
              lineClamp={2}
              title={player.name}
              style={{ overflowWrap: "anywhere" }}
            >
              {player.name}
            </Text>
            <Group gap="0 xs" justify="space-between" aria-hidden="true">
              <Group gap={6} wrap="nowrap">
                <IconCards size={18} />
                <Text>{cards}</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {current
                  ? "Playing"
                  : unoPlayer === player.id
                    ? "Uno?"
                    : "Waiting"}
              </Text>
            </Group>
          </li>
        );
      })}
    </ul>
  );
}

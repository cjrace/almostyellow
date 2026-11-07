"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/unogame/engine/cards";
import { fanLayout } from "@/unogame/handlayout";
import { sortHand } from "@/unogame/handsort";
import { UnoCardButton } from "@/components/unocard";
import styles from "@/styles/unotable.module.css";

interface UnoHandProps {
  cards: Card[];
  playableIds: number[];
  drawnCardId: number | null;
  // Why an unplayable card cannot be played, for its accessible name
  reason: string;
  onPlay: (card: Card) => void;
}

// Until the space has been measured
const DEFAULT_SIZE = { width: 320, height: 800 };

// Your cards as an overlapping fan, so the whole hand fits on screen. Every
// card keeps its top-left corner showing, and the focused or hovered card
// comes to the front.
export default function UnoHand({
  cards,
  playableIds,
  drawnCardId,
  reason,
  onPlay,
}: UnoHandProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      setSize({ width: list.clientWidth, height: window.innerHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Sorted by colour and number, wherever the card came from
  const sorted = useMemo(() => sortHand(cards), [cards]);

  const layout = fanLayout({
    width: size.width,
    viewportHeight: size.height,
    count: cards.length,
  });

  return (
    <ul
      ref={listRef}
      className={styles.hand}
      style={{ height: layout.height }}
      aria-label={`Your hand, ${String(cards.length)} ${cards.length === 1 ? "card" : "cards"}`}
    >
      {sorted.map((card, index) => (
        <li
          key={card.id}
          className={styles.handCard}
          style={{
            width: layout.cardWidth,
            left: layout.positions[index].left,
            top: layout.positions[index].top,
          }}
        >
          <UnoCardButton
            card={card}
            playable={playableIds.includes(card.id)}
            justDrawn={card.id === drawnCardId}
            reason={reason}
            onPlay={onPlay}
          />
        </li>
      ))}
    </ul>
  );
}

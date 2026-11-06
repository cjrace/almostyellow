import type { Card } from "@/unogame/engine/cards";
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

// Your cards in one row that scrolls on its own, so a large hand never makes
// the page scroll sideways. The list is focusable for keyboard scrolling when
// no card is in reach.
export default function UnoHand({
  cards,
  playableIds,
  drawnCardId,
  reason,
  onPlay,
}: UnoHandProps) {
  return (
    <ul
      className={styles.hand}
      aria-label={`Your hand, ${String(cards.length)} ${cards.length === 1 ? "card" : "cards"}`}
    >
      {cards.map((card) => (
        <li key={card.id} className={styles.handCard}>
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

import { Image, UnstyledButton } from "@mantine/core";
import type { Card } from "@/unogame/engine/cards";
import {
  getUnoCardImagePath,
  getUnoCardName,
  unoCardBackImagePath,
} from "@/unogame/cards";
import playing from "@/styles/playingcard.module.css";
import styles from "@/styles/unotable.module.css";

interface UnoCardProps {
  card: Card | null; // null shows the back of the card
  decorative?: boolean; // When the card is already named in text beside it
}

// Face-down cards never say which card they are
export function UnoCard({ card, decorative }: UnoCardProps) {
  return (
    <Image
      className={playing.card}
      src={card ? getUnoCardImagePath(card) : unoCardBackImagePath}
      alt={decorative ? "" : card ? getUnoCardName(card) : "Face-down card"}
      fit="contain"
    />
  );
}

interface UnoCardButtonProps {
  card: Card;
  playable: boolean;
  justDrawn?: boolean;
  // Why the card cannot be played, said in its accessible name
  reason: string;
  onPlay: (card: Card) => void;
}

// An unplayable card stays focusable, so its name and reason can be read; it
// is marked aria-disabled and ignores clicks
export function UnoCardButton({
  card,
  playable,
  justDrawn,
  reason,
  onPlay,
}: UnoCardButtonProps) {
  const name = getUnoCardName(card);
  return (
    <UnstyledButton
      className={styles.cardButton}
      data-uno-card={card.id}
      data-playable={playable ? "" : undefined}
      data-drawn={justDrawn ? "" : undefined}
      aria-disabled={!playable}
      aria-label={
        playable
          ? `${name}${justDrawn ? ", just drawn" : ""}, play`
          : `${name}, ${reason}`
      }
      onClick={() => {
        if (playable) onPlay(card);
      }}
    >
      <UnoCard card={card} decorative />
      {justDrawn && (
        <span className={styles.newTag} aria-hidden="true">
          New
        </span>
      )}
    </UnstyledButton>
  );
}

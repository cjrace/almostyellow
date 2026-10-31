import { useEffect } from "react";
import { Image } from "@mantine/core";
import {
  Card,
  CardBackImagePath,
  createCardDeck,
  getCardImagePath,
  getCardName,
} from "@/components/carddeck";
import styles from "@/styles/playingcard.module.css";

// Loads every card image up front, so a drawn card shows straight away rather
// than the old card staying up until the new one arrives
export function usePreloadCards() {
  useEffect(() => {
    for (const card of createCardDeck()) {
      new window.Image().src = getCardImagePath(card);
    }
  }, []);
}

interface PlayingCardProps {
  card: Card | null; // null shows the back of the card
}

export default function PlayingCard({ card }: PlayingCardProps) {
  // Face-down cards never say which card they are
  return (
    <Image
      className={styles.card}
      src={card ? getCardImagePath(card) : CardBackImagePath}
      alt={card ? getCardName(card.suit, card.rank) : "Face-down card"}
      fit="contain"
    />
  );
}

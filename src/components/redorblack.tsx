"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, List, Modal, Text } from "@mantine/core";
import {
  Card,
  createCardDeck,
  drawCards,
  getCardName,
  shuffleDeck,
} from "@/components/carddeck";
import CardGameTitle from "@/components/cardgametitle";
import PlayingCard, { usePreloadCards } from "@/components/playingcard";
import layout from "@/styles/cardgame.module.css";
import styles from "@/styles/playingcard.module.css";

export default function RedOrBlack() {
  usePreloadCards();
  // The deck is shuffled on the first draw rather than on the server, so the
  // page renders the same on both
  const [deck, setDeck] = useState<Card[] | null>(null);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [drawnOpened, setDrawnOpened] = useState(false);
  const latestCard = drawnCards.at(-1) ?? null;
  const cardsRemaining = deck?.length ?? 52;

  // Each button disables itself at one end of the deck, so focus moves to the
  // other one rather than being lost
  const drawButtonRef = useRef<HTMLButtonElement>(null);
  const shuffleButtonRef = useRef<HTMLButtonElement>(null);
  const focusNextRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    focusNextRef.current?.focus();
    focusNextRef.current = null;
  }, [deck]);

  const drawCard = () => {
    const currentDeck = deck ?? shuffleDeck(createCardDeck());
    if (currentDeck.length === 0) return;

    const { drawn, remaining } = drawCards(currentDeck, 1);
    if (remaining.length === 0) focusNextRef.current = shuffleButtonRef.current;
    setDrawnCards([...drawnCards, ...drawn]);
    setDeck(remaining);
  };

  const newDeck = () => {
    focusNextRef.current = drawButtonRef.current;
    setDeck(null);
    setDrawnCards([]);
  };

  return (
    <div className={layout.game}>
      <CardGameTitle
        title="Red or Black v1"
        creditLink="https://github.com/BenjaminJPalmer/red-or-black-v1"
      >
        <Text mb="sm">
          A Ben Palmer special designed to encourage drinking.
        </Text>
        <List variant="ordered">
          <List.Item>
            guess out loud whether the next card is red or black
          </List.Item>
          <List.Item>
            &apos;Draw a card&apos; to see if you were right
          </List.Item>
          <List.Item>if you guess wrong, take a drink</List.Item>
          <List.Item>if you guess right, assign drinks to others</List.Item>
          <List.Item>
            keep going until the deck runs out, then shuffle a new one
          </List.Item>
        </List>
      </CardGameTitle>

      <div className={`${layout.board} ${layout.sideBySide}`}>
        <div className={layout.table}>
          <div className={styles.single}>
            <PlayingCard card={latestCard} />
          </div>
        </div>

        <div className={layout.controls}>
          {/* Always two lines, even before the first draw, so the buttons
              below don't jump about as card names change length */}
          <Text ta="center" id="cards_remaining" aria-live="polite">
            <span className={layout.line}>
              {latestCard
                ? `You drew the ${getCardName(latestCard.suit, latestCard.rank)}.`
                : " "}
            </span>{" "}
            <span className={layout.line}>
              {`${cardsRemaining.toString()} cards remaining`}
            </span>
          </Text>
          <Button
            ref={drawButtonRef}
            disabled={cardsRemaining === 0}
            onClick={drawCard}
            fullWidth
          >
            Draw a card
          </Button>
          {cardsRemaining === 0 && (
            <Alert title="Deck Exhausted" color="red">
              You have drawn a full deck, please reshuffle.
            </Alert>
          )}
          <Button
            variant="default"
            onClick={() => {
              setDrawnOpened(true);
            }}
            fullWidth
            disabled={latestCard === null}
          >
            View all drawn cards
          </Button>
          <Button
            ref={shuffleButtonRef}
            // Once the deck runs out, shuffling is the next thing to do
            variant={cardsRemaining === 0 ? "filled" : "default"}
            onClick={newDeck}
            fullWidth
            disabled={latestCard === null}
          >
            Shuffle new deck
          </Button>
        </div>
      </div>

      <Modal
        opened={drawnOpened}
        onClose={() => {
          setDrawnOpened(false);
        }}
        size="xs"
        title="All drawn cards"
        closeButtonProps={{ "aria-label": "Close modal" }}
      >
        <List type="ordered" withPadding>
          {drawnCards.map((card) => (
            <List.Item key={`${card.rank}-${card.suit}`}>
              {getCardName(card.suit, card.rank)}
            </List.Item>
          ))}
        </List>
      </Modal>
    </div>
  );
}

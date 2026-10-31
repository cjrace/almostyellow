"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Grid, List, Space, Stack, Text } from "@mantine/core";
import {
  Card,
  createCardDeck,
  drawCards,
  shuffleDeck,
} from "@/components/carddeck";
import CardGameTitle from "@/components/cardgametitle";
import PlayingCard, { usePreloadCards } from "@/components/playingcard";
import styles from "@/styles/playingcard.module.css";

export default function RedOrBlack() {
  usePreloadCards();
  // The deck is shuffled on the first draw rather than on the server, so the
  // page renders the same on both
  const [deck, setDeck] = useState<Card[] | null>(null);
  const [latestCard, setLatestCard] = useState<Card | null>(null);
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
    setLatestCard(drawn[0]);
    setDeck(remaining);
  };

  const newDeck = () => {
    focusNextRef.current = drawButtonRef.current;
    setDeck(null);
    setLatestCard(null);
  };

  return (
    <Grid>
      <Grid.Col span={12}>
        <CardGameTitle
          title="Red or Black"
          creditLink="https://github.com/BenjaminJPalmer/red-or-black-v1"
        >
          <Text mb="sm">
            Ben made this to play at university, so you only need a phone rather
            than a pack of cards.
          </Text>
          <List variant="ordered">
            <List.Item>
              guess out loud whether the next card is red or black
            </List.Item>
            <List.Item>
              press &apos;Draw a card&apos; to see if you were right
            </List.Item>
            <List.Item>
              keep going until the deck runs out, then shuffle a new one
            </List.Item>
          </List>
        </CardGameTitle>
      </Grid.Col>

      <Space h="xl" />

      <Grid.Col span={{ base: 12, sm: 6 }}>
        <div className={styles.single}>
          <PlayingCard card={latestCard} />
        </div>
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 5, lg: 4 }}>
        <Stack>
          <Text ta="center" id="cards_remaining" aria-live="polite">
            {latestCard
              ? `You drew the ${latestCard.rank} of ${latestCard.suit}. `
              : ""}
            {`${cardsRemaining.toString()} cards remaining`}
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
            ref={shuffleButtonRef}
            variant="default"
            onClick={newDeck}
            fullWidth
            disabled={latestCard === null}
          >
            Shuffle new deck
          </Button>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

"use client";

import { useState } from "react";
import { Card, getCardName, createCardDeck } from "@/components/carddeck";
import {
  SemiCircleProgress,
  Breadcrumbs,
  Anchor,
  Alert,
  Grid,
  Button,
  Space,
} from "@mantine/core";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Irish Bingo", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default function IrishBingoPage() {
  // Initialize state for the decks
  const [mainDeck, setMainDeck] = useState<Card[]>(createCardDeck());
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);

  // Function to draw a random card
  const drawCard = () => {
    if (mainDeck.length > 0) {
      // Shuffle the main deck
      const shuffledDeck = [...mainDeck].sort(() => Math.random() - 0.5);

      // Draw the top card from the shuffled deck
      const [drawnCard, ...remainingMainDeck] = shuffledDeck;

      setDrawnCards([...drawnCards, drawnCard]);
      setMainDeck(remainingMainDeck);
    }
  };

  // Reset the deck to start drawing again
  const newDeck = () => {
    setMainDeck(createCardDeck());
    setDrawnCards([]); // Clear the drawn cards as well
  };

  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>
      <h1>Irish bingo</h1>

      <Grid gutter={{ base: 5, xs: "md", md: "xl", xl: 50 }}>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <SemiCircleProgress
            size={250}
            // Make each draw 1/52 of the way
            value={drawnCards.length * 1.923}
            label={`${drawnCards.length} out of 52 Cards Drawn`}
          />

          <Space h="lg" />

          <Button disabled={mainDeck.length === 0} onClick={drawCard}>
            Draw a Card
          </Button>
          <Button onClick={newDeck}>Shuffle new deck</Button>

          {mainDeck.length === 0 && (
            <Alert title="Deck Exhausted" color="red">
              You have drawn a full deck, please reshuffle.
            </Alert>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <ul>
            {drawnCards.map((card, index) => (
              <li key={index}>{getCardName(card.suit, card.rank)}</li>
            ))}
          </ul>
        </Grid.Col>
      </Grid>
    </div>
  );
}

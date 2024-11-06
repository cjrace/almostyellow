"use client";

import { useState } from "react";
import { Card, getCardName, createCardDeck } from "@/components/carddeck";
import {
  Breadcrumbs,
  Anchor,
  Alert,
  Grid,
  Button,
  Space,
  Image,
  Box,
  Progress,
  Accordion,
} from "@mantine/core";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Irish Bingo",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Irish Bingo", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const CalloutBox: React.FC<{ card: Card | null }> = ({ card }) => (
  <Box
    style={{
      border: "2px solid #ccc",
      borderRadius: "15px",
      padding: "1px",
      textAlign: "center",
      position: "relative",
      width: "100%",
      background: "#4b4b4b",
    }}
  >
    <div
      id="calling_card"
      style={{
        content: '""',
        position: "absolute",
        top: "70px",
        left: "-10px",
        width: "0",
        height: "0",
        borderTop: "10px solid transparent",
        borderBottom: "10px solid transparent",
        borderRight: "10px solid #ccc",
      }}
    ></div>

    <h3>Calling..</h3>
    {card ? (
      <p id="latest_card">{getCardName(card.suit, card.rank)}</p>
    ) : (
      <p id="latest_card">No cards drawn yet</p>
    )}
  </Box>
);

export default function IrishBingoPage() {
  // Initialize state for the decks
  const [mainDeck, setMainDeck] = useState<Card[]>(createCardDeck());
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [latestCard, setLatestCard] = useState<Card | null>(null);

  // Function to draw a random card
  const drawCard = () => {
    if (mainDeck.length > 0) {
      // Shuffle the main deck
      const shuffledDeck = [...mainDeck].sort(() => Math.random() - 0.5);

      // Draw the top card from the shuffled deck
      const [drawnCard, ...remainingMainDeck] = shuffledDeck;

      setDrawnCards([...drawnCards, drawnCard]);
      setLatestCard(drawnCard);
      setMainDeck(remainingMainDeck);
    }
  };

  // Reset the deck to start drawing again
  const newDeck = () => {
    setMainDeck(createCardDeck());
    setDrawnCards([]); // Clear the drawn cards as well
    setLatestCard(null); // Clear the latest card
  };

  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>
      <h1>Irish Bingo</h1>

      <Space h="xl" />

      <Grid gutter={{ base: 5, xs: "md", md: "xl", xl: 50 }}>
        <Grid.Col
          span={{ base: 4, sm: 6, lg: 6 }}
          style={{ display: "flex", justifyContent: "center" }}
        >
          <Image
            aria-hidden
            src="/images/tayto.png"
            alt="Mr. Tayto"
            fit="contain"
            h="auto"
            w="auto"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 8, sm: 5, lg: 4 }}>
          <CalloutBox card={latestCard} />
          <Space h="xl" />
          <Progress
            // Make each draw 1/52 of the way
            value={drawnCards.length * 1.923}
            size="lg"
          />
          <p id="card_count">{`${drawnCards.length} / 52 cards`}</p>
          <Space h="md" />
          <Button disabled={mainDeck.length === 0} onClick={drawCard} fullWidth>
            Draw a Card
          </Button>
          <Space h="md" />
          <Button variant="default" onClick={newDeck} fullWidth>
            Shuffle New Deck
          </Button>
          <Space h="md" />
          {mainDeck.length === 0 && (
            <Alert title="Deck Exhausted" color="red">
              You have drawn a full deck, please reshuffle.
            </Alert>
          )}
          <Space h="md" />
          <Accordion variant="filled">
            <Accordion.Item key="All cards called" value="All cards called">
              <Accordion.Control>All cards called</Accordion.Control>
              <Accordion.Panel>
                <ol>
                  {drawnCards.map((card, index) => (
                    <li key={index}>{getCardName(card.suit, card.rank)}</li>
                  ))}
                </ol>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Grid.Col>
      </Grid>
    </div>
  );
}

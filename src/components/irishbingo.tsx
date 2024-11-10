"use client";

import { useState } from "react";
import { Card, getCardName, createCardDeck } from "@/components/carddeck";
import {
  Alert,
  Grid,
  Button,
  Space,
  Image,
  Box,
  Progress,
  Accordion,
  Text,
  Title,
  List,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import playConfetti from "@/components/playconfetti";
import { IconConfetti } from "@tabler/icons-react";

const CalloutBox: React.FC<{ card: Card | null }> = ({ card }) => (
  <Box
    style={{
      border: "2px solid #ccc",
      borderRadius: "15px",
      padding: "1px",
      textAlign: "center",
      position: "relative",
      width: "100%",
      background: "none",
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

    <Title mt="md" order={2}>
      Calling..
    </Title>
    {card ? (
      <Text my="md" id="latest_card">
        {getCardName(card.suit, card.rank)}
      </Text>
    ) : (
      <Text my="md" id="latest_card">
        No cards drawn yet
      </Text>
    )}
  </Box>
);

export default function IrishBingo() {
  // Initialize state for the decks
  const [mainDeck, setMainDeck] = useState<Card[]>(createCardDeck());
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [latestCard, setLatestCard] = useState<Card | null>(null);
  const progressColor = drawnCards.length > 35 ? "red" : "";

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

  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Grid>
      <Grid.Col
        span={{ base: 4, sm: 6, lg: 6 }}
        style={{ display: "flex", justifyContent: "center" }}
      >
        <Box style={{ display: "flex", alignItems: "flex-start" }}>
          <Image
            aria-hidden
            src="/images/tayto.png"
            alt="Mr. Tayto"
            fit="contain"
            h="auto"
            w="auto"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Box>
      </Grid.Col>

      <Grid.Col span={{ base: 8, sm: 5, lg: 4 }}>
        <CalloutBox card={latestCard} />
        <Space h="xl" />
        <Progress
          // Make each draw 1/52 of the way
          value={drawnCards.length * 1.923}
          size="lg"
          color={progressColor}
        />
        <Text mt="sm" id="card_count">{`${drawnCards.length} / 52 cards`}</Text>
        <Space h="md" />
        <Button disabled={mainDeck.length === 0} onClick={drawCard} fullWidth>
          Draw a card
        </Button>
        <Space h="md" />
        <Button
          variant="default"
          onClick={open}
          fullWidth
          disabled={drawnCards.length > 1 ? false : true}
        >
          View all called cards
        </Button>
        <Space h="md" />
        {mainDeck.length === 0 && (
          <>
            <Alert title="Deck Exhausted" color="red">
              You have drawn a full deck, please reshuffle.
            </Alert>
            <Space h="md" />
          </>
        )}
        <Button
          variant="default"
          onClick={newDeck}
          fullWidth
          disabled={drawnCards.length > 0 ? false : true}
        >
          Shuffle new deck
        </Button>
        <Space h="md" />
        {drawnCards.length >= 10 && (
          <Button
            variant="default"
            onClick={playConfetti}
            fullWidth
            rightSection={<IconConfetti />}
          >
            Has someone won?
          </Button>
        )}

        <Modal
          opened={opened}
          onClose={close}
          size="xs"
          title="All called cards"
        >
          <List type="ordered" withPadding>
            {drawnCards.map((card, index) => (
              <List.Item key={index}>
                {getCardName(card.suit, card.rank)}
              </List.Item>
            ))}
          </List>
        </Modal>
      </Grid.Col>
    </Grid>
  );
}

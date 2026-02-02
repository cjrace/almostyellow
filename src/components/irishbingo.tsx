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
  Group,
  ActionIcon,
  Text,
  Title,
  List,
  Modal,
  Anchor,
  Tooltip,
  Center,
  Container,
} from "@mantine/core";
import playConfetti from "@/components/playconfetti";
import { IconConfetti, IconInfoCircle } from "@tabler/icons-react";

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

  const [modalCardOpened, setModalCardOpened] = useState(false);
  const [modalInstructionsOpened, setModalInstructionsOpened] = useState(false);

  return (
    <Grid>
      <Grid.Col span={12}>
        <Group gap="xs">
          <Title>Irish Bingo</Title>
          <Tooltip
            label="Game instructions"
            openDelay={250}
            position="right"
            offset={5}
          >
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Open game instructions modal"
              onClick={() => {
                setModalInstructionsOpened(true);
              }}
            >
              <IconInfoCircle />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Modal
          size="auto"
          opened={modalInstructionsOpened}
          onClose={() => {
            setModalInstructionsOpened(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ib_instructions"
          withCloseButton={false}
          transitionProps={{
            transition: "fade",
            duration: 300,
            timingFunction: "linear",
          }}
          overlayProps={{
            backgroundOpacity: 0.75,
            blur: 3,
          }}
        >
          <Container>
            <Title order={2} mb="sm" id="ib_instructions">
              Irish Bingo instructions
            </Title>
            <Text>This game can be played with any number of players.</Text>
            <Title order={3} my="md">
              Standard rules
            </Title>
            <List variant="ordered" mb="md">
              <List.Item>
                deal 13 cards at random to all players from a standard 52 card
                deck (use multiple decks if necessary based on the number of
                players)
              </List.Item>
              <List.Item>players then lay out all cards face up</List.Item>
              <List.Item>
                the caller then starts calling cards, players turn their cards
                face down if they are called
              </List.Item>
              <List.Item>
                first player to turn over all of their cards shouts
                &apos;Tayto&apos; and wins
              </List.Item>
            </List>
            <Text mb="sm">
              Note that it is usually worth double checking the winners cards,
              especially if alcohol has been involved.
            </Text>
            <Text mb="sm">
              Different players can have have duplicates of cards, though no
              individual player should have duplicate cards themselves.
            </Text>
            <Text>
              For example players A and B both having the 7 of Hearts is fine,
              but player A should not have two 7 of Hearts cards.
            </Text>
            <Title order={3} my="md">
              Tie breaks
            </Title>
            <Text>
              Tie breaks are decided in any way you like. We suggest a quick
              game of{" "}
              <Anchor
                target="_blank"
                href="/games/boomboompirate"
                rel="noreferrer"
              >
                Boom Boom Pirate (opens in new tab)
              </Anchor>
              , or a simple high card draw.
            </Text>
            <Title order={3} my="md">
              Variations
            </Title>
            <Text>
              You can change the number of cards per player if you want a longer
              or shorter game, or are limited in the number of cards you have.
            </Text>
            <Center>
              <Button
                variant="subtle"
                mt="md"
                onClick={() => {
                  setModalInstructionsOpened(false);
                }}
              >
                Close instructions modal
              </Button>
            </Center>
          </Container>
        </Modal>
      </Grid.Col>

      <Space h="xl" />

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
          aria-label="Progress bar showing number of cards drawn from a standard deck of 52"
        />
        <Text
          mt="sm"
          id="card_count"
          ta="center"
        >{`${drawnCards.length.toString()} / 52 cards`}</Text>
        <Space h="md" />
        <Button disabled={mainDeck.length === 0} onClick={drawCard} fullWidth>
          Draw a card
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
          onClick={() => {
            setModalCardOpened(true);
          }}
          fullWidth
          disabled={drawnCards.length > 1 ? false : true}
        >
          View all called cards
        </Button>

        <Modal
          opened={modalCardOpened}
          onClose={() => {
            setModalCardOpened(false);
          }}
          size="xs"
          title="All called cards"
          transitionProps={{
            transition: "fade",
            duration: 300,
            timingFunction: "linear",
          }}
          closeButtonProps={{ "aria-label": "Close modal" }}
        >
          <List type="ordered" withPadding>
            {drawnCards.map((card, index) => (
              <List.Item key={index}>
                {getCardName(card.suit, card.rank)}
              </List.Item>
            ))}
          </List>
        </Modal>

        <Space h="md" />

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
      </Grid.Col>
    </Grid>
  );
}

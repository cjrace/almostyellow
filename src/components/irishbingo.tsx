"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { Card, getCardName, createCardDeck } from "@/components/carddeck";
import {
  Alert,
  Button,
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
import PlayingCard, { usePreloadCards } from "@/components/playingcard";
import { IconConfetti, IconInfoCircle } from "@tabler/icons-react";
import layout from "@/styles/cardgame.module.css";
import cardStyles from "@/styles/playingcard.module.css";
import bingo from "@/styles/irishbingo.module.css";

// The card grows to fill the height left above the buttons. On phones Mr.
// Tayto calls the card from a speech bubble, in the height the text takes
const CalloutBox: React.FC<{ card: Card | null }> = ({ card }) => (
  <>
    <Group justify="center" gap="sm" wrap="nowrap">
      <Image
        hiddenFrom="sm"
        aria-hidden
        src="/images/tayto.png"
        alt=""
        h={64}
        w="auto"
        fit="contain"
        data-testid="caller-mascot"
      />
      <Box ta="center" className={bingo.bubble}>
        <Title
          order={2}
          fz={{
            base: "var(--mantine-h3-font-size)",
            sm: "var(--mantine-h2-font-size)",
          }}
        >
          Calling..
        </Title>
        <Text mt={4} id="latest_card">
          {card ? getCardName(card.suit, card.rank) : "No cards drawn yet"}
        </Text>
      </Box>
    </Group>
    <div className={`${layout.table} ${bingo.table}`} id="calling_card">
      <div className={cardStyles.single}>
        <PlayingCard card={card} decorative />
      </div>
    </div>
  </>
);

export default function IrishBingo() {
  usePreloadCards();
  // Initialize state for the decks
  const [mainDeck, setMainDeck] = useState<Card[]>(createCardDeck);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [latestCard, setLatestCard] = useState<Card | null>(null);
  const progressColor = drawnCards.length > 35 ? "red" : "";

  // At one end of the deck each button goes, or disables itself, so focus
  // moves to the other one rather than being lost. The ref is read after the
  // render, as Draw isn't on the page while the deck is empty
  const drawButtonRef = useRef<HTMLButtonElement>(null);
  const shuffleButtonRef = useRef<HTMLButtonElement>(null);
  const focusNextRef = useRef<RefObject<HTMLButtonElement | null> | null>(null);
  useEffect(() => {
    focusNextRef.current?.current?.focus();
    focusNextRef.current = null;
  }, [mainDeck]);

  // Function to draw a random card
  const drawCard = () => {
    if (mainDeck.length > 0) {
      // Shuffle the main deck
      const shuffledDeck = [...mainDeck].sort(() => Math.random() - 0.5);

      // Draw the top card from the shuffled deck
      const [drawnCard, ...remainingMainDeck] = shuffledDeck;

      if (remainingMainDeck.length === 0) {
        focusNextRef.current = shuffleButtonRef;
      }
      setDrawnCards([...drawnCards, drawnCard]);
      setLatestCard(drawnCard);
      setMainDeck(remainingMainDeck);
    }
  };

  // Reset the deck to start drawing again
  const newDeck = () => {
    focusNextRef.current = drawButtonRef;
    setMainDeck(createCardDeck());
    setDrawnCards([]); // Clear the drawn cards as well
    setLatestCard(null); // Clear the latest card
  };

  const [modalCardOpened, setModalCardOpened] = useState(false);
  const [modalInstructionsOpened, setModalInstructionsOpened] = useState(false);

  return (
    <div className={layout.game}>
      <div>
        <Group gap="xs">
          <Title
            fz={{
              base: "var(--mantine-h2-font-size)",
              sm: "var(--mantine-h1-font-size)",
            }}
          >
            Irish Bingo
          </Title>
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
      </div>

      {/* Phones give the card all the height left, with the buttons at the
          bottom. Wider screens put Mr. Tayto beside it */}
      <div className={bingo.board}>
        <Box visibleFrom="sm" className={bingo.mascot}>
          <Image
            aria-hidden
            src="/images/tayto.png"
            alt="Mr. Tayto"
            fit="contain"
            h="auto"
            w="auto"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        </Box>

        <div className={bingo.caller}>
          <CalloutBox card={latestCard} />
          <div className={layout.controls}>
            <Progress
              // Make each draw 1/52 of the way
              value={drawnCards.length * 1.923}
              size="lg"
              color={progressColor}
              aria-label="Progress bar showing number of cards drawn from a standard deck of 52"
            />
            {/* "Has someone won?" shares the count's row, and the alert takes
                the Draw button's place, so the card keeps its size on phones.
                The row is the button's height before it shows up at 10 cards,
                so the card doesn't shrink partway through */}
            <Group justify="center" gap="md" mih={36}>
              <Text id="card_count">{`${drawnCards.length.toString()} / 52 cards`}</Text>
              {drawnCards.length >= 10 && (
                <Button
                  variant="default"
                  onClick={playConfetti}
                  rightSection={<IconConfetti size={16} />}
                >
                  Has someone won?
                </Button>
              )}
            </Group>
            {mainDeck.length === 0 ? (
              <Alert
                title="Deck Exhausted: please reshuffle"
                color="red"
                py="xs"
              />
            ) : (
              <Button ref={drawButtonRef} onClick={drawCard} fullWidth>
                Draw a card
              </Button>
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
                {drawnCards.map((card) => (
                  <List.Item key={`${card.rank}-${card.suit}`}>
                    {getCardName(card.suit, card.rank)}
                  </List.Item>
                ))}
              </List>
            </Modal>

            <Button
              // Once the deck runs out, shuffling is the next thing to do
              variant={mainDeck.length === 0 ? "filled" : "default"}
              ref={shuffleButtonRef}
              onClick={newDeck}
              fullWidth
              disabled={drawnCards.length > 0 ? false : true}
            >
              Shuffle new deck
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

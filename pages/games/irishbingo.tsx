import React, { useState } from "react";
import styles from "../../app/page.module.css";
import Image from "next/image";
import { Card, getCardName } from "../../components/games/card";
import { createCardDeck } from "../../components/games/createcarddeck";
import {
  SemiCircleProgress,
  Breadcrumbs,
  Anchor,
  Alert,
  Grid,
  GridCol,
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

const IrishBingoPage: React.FC = () => {
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
    <div className={styles.page}>
      <main className={styles.main}>
        <Breadcrumbs>{crumbitems}</Breadcrumbs>
        <h1>Irish bingo</h1>

        <Grid>
          <GridCol span={4}>
            <SemiCircleProgress
              size={250}
              value={drawnCards.length * 1.923} // To make each draw 1/52 of the way
              label={`${drawnCards.length} out of 52 Cards Drawn`}
            />

            <button disabled={mainDeck.length === 0} onClick={drawCard}>
              Draw a Card
            </button>
            <button onClick={newDeck}>Shuffle new deck</button>

            {mainDeck.length === 0 && (
              <Alert title="Deck Exhausted" color="red">
                You have drawn a full deck, please reshuffle.
              </Alert>
            )}
          </GridCol>

          <Grid.Col span={4}>
            <ul>
              {drawnCards.map((card, index) => (
                <li key={index}>{getCardName(card.suit, card.rank)}</li>
              ))}
            </ul>
          </Grid.Col>

          <GridCol span={4}>
            <Image
              aria-hidden
              src="/images/tayto.svg"
              alt="Mr. Tayto"
              height={300}
              width={300}
              style={{ display: "block", margin: "0 auto" }}
            />
          </GridCol>
        </Grid>
      </main>
    </div>
  );
};

export default IrishBingoPage;

import React, { useState } from 'react';
import styles from '../../app/page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { Card, getCardName } from '../../components/games/card';
import { createCardDeck } from '../../components/games/createcarddeck';

const IrishBingoPage = () => {
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
    const resetDeck = () => {
        setMainDeck(createCardDeck());
        setDrawnCards([]); // Clear the drawn cards as well
    };

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <h1>Irish bingo</h1>

                <div className={styles.ctas}>
                    <Link href="/games" className={styles.secondary}>Back to games</Link>
                </div>

                <button onClick={drawCard}>Draw a Card</button>
                <button onClick={resetDeck}>Reset Deck</button>

                {/* Display the drawn cards */}
                <ul>
                    {drawnCards.map((card, index) => (
                        <li key={index}>{getCardName(card.suit, card.rank)}</li>
                    ))}
                </ul>

                <Image
                    aria-hidden
                    src="/images/tayto.svg"
                    alt="Mr. Tayto"
                    height={300}
                    width={300}
                    style={{ display: 'block', margin: '0 auto' }}
                />

            </main>
        </div>
    );
};

export default IrishBingoPage;
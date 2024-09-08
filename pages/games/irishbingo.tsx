import styles from '../../app/page.module.css';
import Link from 'next/link';
import Image from 'next/image';

const irishbingoPage = () => {
  const [deck, setDeck] = useState([
    // Add your card IDs or objects here (e.g., ["card1", "card2", "card3"])
  ]);
  const [drawnCards, setDrawnCards] = useState([]);

  const drawCard = () => {
    if (deck.length === 0) {
      alert('No more cards!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * deck.length);
    const drawnCard = deck[randomIndex];

    setDeck((prevDeck) => prevDeck.filter((card) => card !== drawnCard));
    setDrawnCards([...drawnCards, drawnCard]);
  };

  const renderCard = (card) => {
    return <div className={styles.card}>Card: {card}</div>;
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Irish bingo</h1>

        <div className={styles.cardDeck}>
          {deck.map((card) => (
            <button key={card} onClick={drawCard} className={styles.cardButton}>
              {/* Initially show face down card UI */}
            </button>
          ))}
        </div>

        <div className={styles.drawnCards}>
          {drawnCards.map(renderCard)}
        </div>

        <Image
          aria-hidden
          src="/images/tayto.svg"
          alt="Mr. Tayto"
          height={300}
          width={300}
          style={{ display: 'block', margin: '0 auto' }}
        />

        <div className={styles.ctas}>
          <Link href="/games" className={styles.secondary}>
            Back to games
          </Link>
        </div>

      </main>
    </div>
  );
};

export default irishbingoPage;
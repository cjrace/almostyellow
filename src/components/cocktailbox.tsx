import Image from "next/image";
import styles from "@/styles/cocktails.module.css";

// Function to convert numeric rating to moons
// (was stars but the half star emoji doesn't exist so I am being creative)
const renderRatingMoons = (rating: number) => {
  const fullMoons = Math.floor(rating);
  const remaining = rating - fullMoons;
  const hasHalfMoon = remaining >= 0.25 && remaining < 0.75;
  const emptyMoons = 5 - fullMoons - (hasHalfMoon ? 1 : 0);
  const moonString =
    `🌝`.repeat(fullMoons) +
    (hasHalfMoon ? `🌗` : "") +
    `🌚`.repeat(emptyMoons);
  return <span>{moonString}</span>;
};

// Create the design for each cocktail entry on the cocktails page
interface Cocktail {
  photoUrl: string;
  name: string;
  rating: number;
  recipe: {
    ingredients: string[];
    instructions: string[];
  };
}

const CocktailBox: React.FC<Cocktail> = ({
  photoUrl,
  name,
  rating,
  recipe,
}) => {
  return (
    <div className={styles.cocktailBox}>
      <div className={styles.cocktailImageContainer}>
        <Image
          aria-hidden
          src={photoUrl}
          alt={name}
          className={styles.cocktailImage}
          height={150}
          width={150}
        />
        <div className={styles.cocktailName}>
          <h2>{name}</h2>
          <div className={styles.ratingContainer}>
            {renderRatingMoons(rating)}
          </div>
        </div>
      </div>
      <div className={styles.cocktailDetails}>
        <div className={styles.column}>
          <h3>Ingredients:</h3>
          <ul className={styles.ingredientsList}>
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>
        <div className={styles.column}>
          <h3>Instructions:</h3>
          <ol className={styles.instructionsList}>
            {recipe.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CocktailBox;

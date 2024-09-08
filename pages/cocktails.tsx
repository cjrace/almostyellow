import React, { useState } from 'react';
import styles from '../app/page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { cocktails } from '../components/cocktails/cocktails'; 
import { renderRatingMoons } from '../components/cocktails/renderratingmoons';

const CocktailsPage: React.FC = () => {
  const [selectedSpirits, setSelectedSpirits] = useState<string[]>([]);

  const filteredCocktails = cocktails.filter((cocktail) => {
    if (selectedSpirits.length === 0 || selectedSpirits.includes("All spirits")) {
      return true; // Show all cocktails if no specific spirits are selected or if "All Spirits" is selected
    }
    return cocktail.spirits.some((spirit) => selectedSpirits.includes(spirit));
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Cocktails</h1>
        <p>Filter by spirit:</p>
        <select
          value={selectedSpirits}
          onChange={(e) => setSelectedSpirits(Array.from(e.target.selectedOptions, (option) => option.value))}
          multiple
          className="form-select"
        >
          <option value="All spirits">All spirits</option>
          <option value="Bourbon">Bourbon</option>
          <option value="Rum">Rum</option>
          {/* Add other spirit options */}
        </select>
        <ul className={styles.cocktailList}>
          {filteredCocktails.map((cocktail) => (
            <div key={cocktail.name} className={styles.cocktailCard}>
              <div className={styles.cocktailBox}>
                <div className={styles.cocktailImageContainer}>
                  <Image
                    aria-hidden
                    src={cocktail.photoUrl}
                    alt={cocktail.name}
                    className={styles.cocktailImage}
                    height={150}
                    width={150}
                  />
                  <div className={styles.cocktailName}>
                    <h2>{cocktail.name}</h2>
                    <div className={styles.ratingContainer}>
                      {renderRatingMoons(cocktail.rating)}
                    </div>
                  </div>
                </div>
                <div className={styles.cocktailDetails}>
                  <h3>Ingredients:</h3>
                  <ul className={styles.ingredientsList}>
                    {cocktail.recipe.ingredients.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                  <h3>Instructions:</h3>
                  <p>{cocktail.recipe.instructions}</p>
                </div>
              </div>
            </div>
          ))}
        </ul>
        <div className={styles.ctas}>
          <Link href="/" className={styles.secondary}>
            Back to homepage
          </Link>
        </div>
      </main>
    </div>
  );
};

export default CocktailsPage;

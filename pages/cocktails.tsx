// CocktailsPage.tsx

import React, { useState } from 'react';
import styles from '../app/page.module.css'; // Your existing styles
import Link from 'next/link';

// Sample cocktail data (you can replace this with your actual data)
const cocktails = [
  {
    name: 'Old Fashioned',
    spirits: ['Bourbon'],
    rating: 2.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: ['Bourbon', 'Sugar', 'Water', 'Bitters'],
      instructions:
        '1. Add a load of crushed ice to the cocktail shaker.\n' +
        '2. Add bourbon, sugar, water, and bitters.\n' +
        '3. Shake loads.\n' +
        '4. Pour into glasses and enjoy.',
    },
  },
  {
    name: 'Cocktail 2',
    spirits: ['Rum'],
    rating: 4.5 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: ['Rum', 'Something fruity', 'Ice'],
      instructions:
        '1. Add a load of crushed ice to the cocktail shaker.\n' +
        '2. Add alcohol and then something fruity.\n' +
        '3. Shake loads.\n' +
        '4. Pour into glasses and enjoy.',
    },
  },
  {
    name: 'Cocktail 3',
    spirits: ['Rum', 'Bourbon'],
    rating: 5.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: ['Rum', 'Bourbon', 'Something fruity', 'Ice'],
      instructions:
        '1. Add a load of crushed ice to the cocktail shaker.\n' +
        '2. Add alcohol and then something fruity.\n' +
        '3. Shake loads.\n' +
        '4. Pour into glasses and enjoy.',
    },
  },
  // Add more cocktails...
];


// Function to convert numeric rating to moons (was stars but the half star emoji doesn't exist so I am being creative)
const renderRatingMoons = (rating: number) => {
  const fullMoons = Math.floor(rating);
  const remaining = rating - fullMoons;
  const hasHalfMoon = remaining >= 0.25 && remaining < 0.75;
  const emptyMoons = 5 - fullMoons - (hasHalfMoon ? 1 : 0);

  const moons = [];
  for (let i = 0; i < fullMoons; i++) {
    moons.push(<span key={i} className={styles.moon}>🌝</span>);
  }
  if (hasHalfMoon) {
    moons.push(<span key="half" className={styles.moon}>🌗</span>);
  }
  for (let i = 0; i < emptyMoons; i++) {
    moons.push(<span key={`empty-${i}`} className={styles.moon}>🌚</span>);
  }

  return <>{moons}</>;
};

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
        <h1>Cocktails Page</h1>
        <p>Filter by spirit:</p>
        <select
            value={selectedSpirits}
            onChange={(e) => setSelectedSpirits(Array.from(e.target.selectedOptions, (option) => option.value))}
            multiple
            className="form-select" // Add this class
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
                  <img src={cocktail.photoUrl} alt={cocktail.name} className={styles.cocktailImage} />
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

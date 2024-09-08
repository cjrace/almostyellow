import React from 'react';
import Image from 'next/image';
import { renderRatingMoons } from './renderratingmoons';
import styles from '../../app/page.module.css';

// Create the design for each cocktail entry on the cocktails page
interface Cocktail {
  photoUrl: string;
  name: string;
  rating: number;
  recipe: {
    ingredients: string[];
    instructions: string;
  };
}

const CocktailBox: React.FC<Cocktail> = ({ photoUrl, name, rating, recipe }) => {
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
        <h3>Ingredients:</h3>
        <ul className={styles.ingredientsList}>
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient}>{ingredient}</li>
          ))}
        </ul>
        <h3>Instructions:</h3>
        <p>{recipe.instructions}</p>
      </div>
    </div>
  );
};

export default CocktailBox;
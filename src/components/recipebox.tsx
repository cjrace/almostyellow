import Image from "next/image";
import styles from "@/styles/recipes.module.css";

// Create the design for each recipe entry on the recipes page
export interface Recipe {
  id: string;
  name: string;
  photoUrl: string;
  ingredients: string[];
  instructions: string[];
}

const RecipeBox: React.FC<Recipe> = ({
  photoUrl,
  name,
  ingredients,
  instructions,
}) => {
  return (
    <div className={styles.recipeBox}>
      <div className={styles.recipeImageContainer}>
        <Image
          aria-hidden
          src={photoUrl}
          alt={name}
          className={styles.recipeImage}
          height={150}
          width={150}
        />
        <div className={styles.recipeName}>
          <h2>{name}</h2>
        </div>
      </div>
      <div className={styles.recipeDetails}>
        <div className={styles.column}>
          <h3>Ingredients:</h3>
          <ul className={styles.ingredientsList}>
            {ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>
        <div className={styles.column}>
          <h3>Instructions:</h3>
          <ol className={styles.instructionsList}>
            {instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RecipeBox;

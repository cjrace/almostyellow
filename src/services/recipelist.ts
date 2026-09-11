"use server";

import { sql } from "@vercel/postgres";
import { Recipe } from "@/components/recipebox";

interface RecipeRow {
  id: string;
  name: string;
  photo_url: string;
  ingredients: string[];
  instructions: string[];
}

export async function createRecipe(recipe: Recipe): Promise<void> {
  try {
    // The tagged-template `sql` helper only types parameters as Primitive,
    // so array columns (ingredients/instructions) go through sql.query instead.
    await sql.query(
      `INSERT INTO recipe_list
       (id, name, photo_url, ingredients, instructions)
       VALUES
       (uuid_generate_v4(), $1, $2, $3, $4);`,
      [recipe.name, recipe.photoUrl, recipe.ingredients, recipe.instructions],
    );
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create a new recipe entry.");
  }
}

export async function readRecipeList(): Promise<Recipe[]> {
  try {
    const data = await sql<RecipeRow>`
      SELECT id, name, photo_url, ingredients, instructions
      FROM recipe_list;
    `;

    const recipes: Recipe[] = data.rows.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      photoUrl: recipe.photo_url,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
    }));

    return recipes;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the recipe list.");
  }
}

export async function readRecipe(recipe_id: string): Promise<Recipe[]> {
  try {
    const data = await sql<RecipeRow>`
      SELECT id, name, photo_url, ingredients, instructions
      FROM recipe_list
      WHERE id = ${recipe_id};
    `;

    if (data.rows.length > 1) {
      throw new Error("More than one recipe found with the given id.");
    }

    if (data.rows.length === 0) {
      throw new Error("No recipe found with the given id.");
    }

    const recipe: Recipe = {
      id: data.rows[0].id,
      name: data.rows[0].name,
      photoUrl: data.rows[0].photo_url,
      ingredients: data.rows[0].ingredients,
      instructions: data.rows[0].instructions,
    };

    return [recipe];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the recipe.");
  }
}

export async function updateRecipe(recipe: Recipe): Promise<void> {
  try {
    await sql.query(
      `UPDATE recipe_list
       SET name = $1,
           photo_url = $2,
           ingredients = $3,
           instructions = $4
       WHERE id = $5;`,
      [
        recipe.name,
        recipe.photoUrl,
        recipe.ingredients,
        recipe.instructions,
        recipe.id,
      ],
    );
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update recipe entry.");
  }
}

export async function deleteRecipe(recipe_id: string) {
  try {
    await sql`DELETE FROM recipe_list WHERE id = ${recipe_id};`;
  } catch {
    return {
      message: "Database Error: Failed to delete item from recipe list.",
    };
  }
}

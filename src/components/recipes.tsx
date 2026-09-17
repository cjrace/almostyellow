"use client";

import { Text, TextInput, ActionIcon, Group, Button } from "@mantine/core";
import { useState, useEffect } from "react";
import { readRecipeList } from "@/services/recipelist";
import styles from "@/styles/recipes.module.css";
import RecipeBox, { Recipe } from "@/components/recipebox";
import { IconX, IconPlus } from "@tabler/icons-react";

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const data = await readRecipeList();
        setRecipes(data);
      } catch (error) {
        console.error("Error fetching recipes:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchRecipes();
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const searchedRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return <Text>Fetching list...</Text>;
  }

  return (
    <>
      <Group my="md" justify="space-between">
        <TextInput
          aria-label="Search recipe names"
          placeholder="Search recipe names..."
          value={searchQuery}
          onChange={handleSearch}
          style={{ flex: 1, minWidth: 200 }}
          rightSection={
            searchQuery && (
              <ActionIcon
                onClick={() => {
                  setSearchQuery("");
                }}
                variant="default"
                aria-label="Clear search query"
              >
                <IconX />
              </ActionIcon>
            )
          }
        />

        <Button
          leftSection={<IconPlus />}
          variant="default"
          component="a"
          href="/admin/recipes/add"
        >
          Add new recipe
        </Button>
      </Group>

      <Text m="xs">
        Showing {searchedRecipes.length} of {recipes.length} recipes
      </Text>

      <div className={styles.recipeList}>
        {searchedRecipes
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((recipe) => (
            <div key={recipe.id} className={styles.recipeCard}>
              <RecipeBox {...recipe} />
            </div>
          ))}
      </div>
    </>
  );
}

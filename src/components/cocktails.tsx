"use client";

import {
  NativeSelect,
  Space,
  TextInput,
  ActionIcon,
  Group,
} from "@mantine/core";
import { useState } from "react";
import { cocktaildata } from "@/components/cocktaildata";
import styles from "@/styles/cocktails.module.css";
import CocktailBox from "@/components/cocktailbox";
import { IconX } from "@tabler/icons-react";

interface Cocktail {
  name: string;
  spirits: string[];
  rating: number;
  photoUrl: string;
  recipe: {
    ingredients: string[];
    instructions: string[];
  };
}

// Generate the dropdown options
const uniqueSpirits = [
  "All spirits",
  ...new Set(cocktaildata.flatMap((cocktail) => cocktail.spirits).sort()),
];

export default function Cocktails() {
  const [selectedSpirits, setSelectedSpirits] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleChange = (value: string) => {
    setSelectedSpirits(value === "All spirits" ? [] : [value]);
  };

  const filteredCocktails = cocktaildata.filter((cocktail: Cocktail) => {
    return (
      selectedSpirits.length === 0 || // Show all if no spirits selected
      cocktail.spirits.some((spirit) => selectedSpirits.includes(spirit)) // Show if any selected spirit matches
    );
  });

  const searchedCocktails = filteredCocktails.filter((cocktail) =>
    cocktail.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <Group my="md">
        <NativeSelect
          aria-label="Filter by base spirit"
          value={
            selectedSpirits.length === 0 ? "All spirits" : selectedSpirits[0]
          }
          onChange={(event) => handleChange(event.target.value)}
          data={uniqueSpirits}
          style={{ minWidth: 200 }}
        />

        <TextInput
          aria-label="Search cocktail names"
          placeholder="Search cocktail names..."
          value={searchQuery}
          onChange={handleSearch}
          style={{ flex: 1, minWidth: 200 }}
          rightSection={
            searchQuery && (
              <ActionIcon
                onClick={() => setSearchQuery("")}
                variant="default"
                aria-label="Clear search query"
              >
                <IconX />
              </ActionIcon>
            )
          }
        />
      </Group>

      <div className={styles.cocktailList}>
        {searchedCocktails
          .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
          .map((cocktail) => (
            <div key={cocktail.name} className={styles.cocktailCard}>
              <CocktailBox {...cocktail} />
            </div>
          ))}
      </div>
    </>
  );
}

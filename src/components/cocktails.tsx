"use client";

import { NativeSelect, Space } from "@mantine/core";
import { useState } from "react";
import { cocktaildata } from "@/components/cocktaildata";
import styles from "@/styles/cocktails.module.css";
import CocktailBox from "@/components/cocktailbox";

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

  const handleChange = (value: string) => {
    setSelectedSpirits(value === "All spirits" ? [] : [value]);
  };

  const filteredCocktails = cocktaildata.filter((cocktail: Cocktail) => {
    return (
      selectedSpirits.length === 0 || // Show all if no spirits selected
      cocktail.spirits.some((spirit) => selectedSpirits.includes(spirit)) // Show if any selected spirit matches
    );
  });

  return (
    <>
      <Space h="md" />
      <NativeSelect
        aria-label="Filter by base spirit"
        value={
          selectedSpirits.length === 0 ? "All spirits" : selectedSpirits[0]
        }
        onChange={(event) => handleChange(event.target.value)}
        data={uniqueSpirits}
      />
      <Space h="md" />
      <div className={styles.cocktailList}>
        {filteredCocktails
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

"use client";

import { Grid, RadioGroup, Radio } from "@mantine/core";
import { useState } from "react";
import { cocktaildata } from "@/components/cocktaildata";
import styles from "@/styles/cocktails.module.css";
import CocktailBox from "@/components/cocktailbox";

// List the dropdown options
const spiritOptions = [
  { value: "All spirits", label: "All spirits" },
  { value: "Baileys", label: "Baileys" },
  { value: "Gin", label: "Gin" },
  { value: "Kahlua", label: "Kahlua" },
  { value: "Rum", label: "Rum" },
  { value: "Tequila", label: "Tequila" },
  { value: "Vodka", label: "Vodka" },
  { value: "Whisky", label: "Whisky" },
  // Add other spirit options as they get added. // TODO: auto generate from data
];

export default function Cocktails() {
  const [selectedSpirits, setSelectedSpirits] = useState<
    { value: string; label: string }[]
  >([]);

  // Show all cocktails if no specific spirits are selected or if "All Spirits" is selected
  const filteredCocktails = cocktaildata.filter((cocktail) => {
    if (
      selectedSpirits.length === 0 ||
      selectedSpirits.some((spirit) => spirit.value === "All spirits")
    ) {
      return true;
    }
    return cocktail.spirits.some((spirit) =>
      selectedSpirits.some((selectedSpirit) => selectedSpirit.value === spirit),
    );
  });

  const [selectedSpirit, setSelectedSpirit] = useState("All spirits");

  const handleChange = (value: string) => {
    setSelectedSpirit(value);

    // If the selected spirit is "All spirits", set the selectedSpirits to an empty array
    if (value === "All spirits") {
      setSelectedSpirits([]);
      return;
    }

    // Otherwise, update the selectedSpirits array
    setSelectedSpirits([
      {
        value,
        label:
          spiritOptions.find((option) => option.value === value)?.label || "",
      },
    ]);
  };

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 2 }}>
        <div style={{ position: "sticky", top: "10px" }}>
          <RadioGroup
            label="Filter by spirit"
            variant="vertical"
            size="lg"
            value={selectedSpirit}
            onChange={handleChange}
          >
            {spiritOptions.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </div>
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 9 }}>
        <div className={styles.cocktailList}>
          {filteredCocktails
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
            .map((cocktail) => (
              <div key={cocktail.name} className={styles.cocktailCard}>
                <CocktailBox {...cocktail} />
              </div>
            ))}
        </div>
      </Grid.Col>
    </Grid>
  );
}

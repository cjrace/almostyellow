"use client";

import { useState, useEffect } from "react";
import { Select, Button, Group, Text, Accordion } from "@mantine/core";
import { WhiskyCard } from "@/components/whiskycard";
import BackToTop from "@/components/backtotop";
import { readWhiskyJournal } from "@/services/whiskyjournal";

export interface Whisky {
  last_edited: Date;
  whisky_id: string;
  name: string;
  distillery: string;
  country_region: string;
  age: number;
  grain: string;
  abv: number;
  rating: number;
  price: number;
  notes: string;
}

export default function WhiskyJournal() {
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWhiskies = async () => {
      try {
        console.log("Requesting new data");
        const data = await readWhiskyJournal();
        console.log("Data fetch successful");
        setWhiskies(data);
      } catch (error) {
        console.error("Error fetching whiskies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWhiskies();
  }, []);
  const whiskyData = whiskies;

  const [grainFilter, setGrainFilter] = useState<string | null>(null);
  const [distilleryFilter, setDistilleryFilter] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [countryRegionFilter, setCountryRegionFilter] = useState<string | null>(
    null,
  );
  const [sortOption, setSortOption] = useState<string | null>(null);

  const filteredWhiskyData = whiskies.filter((whisky) => {
    return (
      (!grainFilter || whisky.grain === grainFilter) &&
      (!distilleryFilter || whisky.distillery === distilleryFilter) &&
      (!ratingFilter || whisky.rating.toString() === ratingFilter) &&
      (!countryRegionFilter || whisky.country_region === countryRegionFilter)
    );
  });

  const sortedWhiskyData = [...filteredWhiskyData].sort((a, b) => {
    switch (sortOption) {
      case "alphabetical":
        return a.name.localeCompare(b.name);
      case "distillery":
        return a.distillery.localeCompare(b.distillery);
      case "ratingAsc":
        return a.rating - b.rating;
      case "ratingDesc":
        return b.rating - a.rating;
      case "ageAsc":
        return a.age - b.age;
      case "ageDesc":
        return b.age - a.age;
      default:
        return 0;
    }
  });

  const grainOptions = Array.from(
    new Set(whiskyData.map((whisky) => whisky.grain)),
  );
  const distilleryOptions = Array.from(
    new Set(whiskyData.map((whisky) => whisky.distillery)),
  );
  const ratingOptions = Array.from(
    new Set(whiskyData.map((whisky) => whisky.rating.toString())),
  );
  const countryRegionOptions = Array.from(
    new Set(whiskyData.map((whisky) => whisky.country_region)),
  );

  const clearAllFilters = () => {
    setGrainFilter(null);
    setDistilleryFilter(null);
    setRatingFilter(null);
    setCountryRegionFilter(null);
    setSortOption(null);
  };

  const sortOptions = [
    { value: "alphabetical", label: "Alphabetical A-Z" },
    { value: "distillery", label: "Distillery A-Z" },
    { value: "ratingAsc", label: "Rating Ascending" },
    { value: "ratingDesc", label: "Rating Descending" },
    { value: "ageAsc", label: "Age Ascending" },
    { value: "ageDesc", label: "Age Descending" },
  ];

  if (loading) {
    return <Text>Fetching journal...</Text>;
  }

  return (
    <>
      <Accordion variant="contained" mb="md">
        <Accordion.Item value="Sort and filter">
          <Accordion.Control>Sort and filter</Accordion.Control>
          <Accordion.Panel>
            <Group mb="md">
              <Select
                label="Grain"
                placeholder="Select grain"
                data={grainOptions}
                value={grainFilter}
                onChange={setGrainFilter}
                clearable
              />
              <Select
                label="Distillery"
                placeholder="Select distillery"
                data={distilleryOptions}
                value={distilleryFilter}
                onChange={setDistilleryFilter}
                clearable
              />
              <Select
                label="Rating"
                placeholder="Select rating"
                data={ratingOptions}
                value={ratingFilter}
                onChange={setRatingFilter}
                clearable
              />
              <Select
                label="Region"
                placeholder="Select region"
                data={countryRegionOptions}
                value={countryRegionFilter}
                onChange={setCountryRegionFilter}
                clearable
              />
              <Select
                label="Sort by"
                placeholder="Select sorting option"
                data={sortOptions}
                value={sortOption}
                onChange={setSortOption}
                clearable
              />
            </Group>
            <Group justify="flex-end">
              <Button onClick={clearAllFilters} size="md" variant="outline">
                Clear All Filters
              </Button>
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {sortedWhiskyData.map((whisky) => (
        <div key={whisky.whisky_id}>
          <WhiskyCard {...whisky} />
        </div>
      ))}
      <BackToTop />
    </>
  );
}

"use client";

import { useState } from "react";
import { Select, Button, Group } from "@mantine/core";
import { whiskyData, WhiskyCard } from "@/components/whiskycard";
import BackToTop from "@/components/backtotop";

export default function WhiskyJournal() {
  const [grainFilter, setGrainFilter] = useState<string | null>(null);
  const [distilleryFilter, setDistilleryFilter] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [countryRegionFilter, setCountryRegionFilter] = useState<string | null>(
    null,
  );
  const [sortOption, setSortOption] = useState<string | null>(null);

  const filteredWhiskyData = whiskyData.filter((whisky) => {
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

  return (
    <>
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
        <Button onClick={clearAllFilters} size="lg" variant="outline">
          Clear All Filters
        </Button>
      </Group>

      {sortedWhiskyData.map((whisky) => (
        <div key={whisky.whisky_id}>
          <WhiskyCard {...whisky} />
        </div>
      ))}
      <BackToTop />
    </>
  );
}

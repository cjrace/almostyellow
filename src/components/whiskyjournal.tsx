"use client";

import { useState, useEffect } from "react";
import {
  Select,
  Button,
  Group,
  Text,
  Accordion,
  TextInput,
  ActionIcon,
  Title,
  Tooltip,
  Modal,
  Container,
  Center,
} from "@mantine/core";
import {
  IconX,
  IconDownload,
  IconInfoCircle,
  IconPlus,
} from "@tabler/icons-react";
import { WhiskyCard } from "@/components/whiskycard";
import BackToTop from "@/components/backtotop";
import { readWhiskyJournal } from "@/services/whiskyjournal";
import { WhiskyPricingScale, WhiskyRatingScale } from "./whiskyscoringscales";

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
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [countryRegionFilter, setCountryRegionFilter] = useState<string | null>(
    null,
  );
  const [sortOption, setSortOption] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const filteredWhiskyData = whiskies.filter((whisky) => {
    return (
      (!grainFilter || whisky.grain === grainFilter) &&
      (!distilleryFilter || whisky.distillery === distilleryFilter) &&
      (!ratingFilter || whisky.rating.toString() === ratingFilter) &&
      (!priceFilter || whisky.price.toString() === priceFilter) &&
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
      case "priceAsc":
        return a.price - b.price;
      case "priceDesc":
        return b.price - a.price;
      case "ageAsc":
        return a.age - b.age;
      case "ageDesc":
        return b.age - a.age;
      default:
        return 0;
    }
  });

  const searchedWhiskyData = sortedWhiskyData.filter((whisky) =>
    whisky.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const grainOptions = Array.from(
    new Set(searchedWhiskyData.map((whisky) => whisky.grain)),
  ).sort();

  const distilleryOptions = Array.from(
    new Set(searchedWhiskyData.map((whisky) => whisky.distillery)),
  ).sort();

  const ratingOptions = Array.from(
    new Set(searchedWhiskyData.map((whisky) => whisky.rating.toString())),
  ).sort((a, b) => parseFloat(a) - parseFloat(b));

  const countryRegionOptions = Array.from(
    new Set(searchedWhiskyData.map((whisky) => whisky.country_region)),
  ).sort();

  const clearAllFilters = () => {
    setGrainFilter(null);
    setDistilleryFilter(null);
    setRatingFilter(null);
    setPriceFilter(null);
    setCountryRegionFilter(null);
    setSortOption(null);
    setSearchQuery("");
  };

  const sortOptions = [
    { value: "alphabetical", label: "Alphabetical A-Z" },
    { value: "distillery", label: "Distillery A-Z" },
    { value: "ratingAsc", label: "Rating Ascending" },
    { value: "ratingDesc", label: "Rating Descending" },
    { value: "ageAsc", label: "Age Ascending" },
    { value: "ageDesc", label: "Age Descending" },
  ];

  const [modalScalesOpened, setModalScalesOpened] = useState(false);

  if (loading) {
    return <Text>Fetching journal...</Text>;
  }

  const exportToCSV = () => {
    const headers = [
      "Last Edited",
      "Whisky ID",
      "Name",
      "Distillery",
      "Country/Region",
      "Age",
      "Grain",
      "ABV",
      "Rating",
      "Price",
      "Notes",
    ];
    const rows = searchedWhiskyData.map((whisky) => [
      `"${whisky.last_edited.toISOString()}"`,
      `"${whisky.whisky_id}"`,
      `"${whisky.name}"`,
      `"${whisky.distillery}"`,
      `"${whisky.country_region}"`,
      `"${whisky.age}"`,
      `"${whisky.grain}"`,
      `"${whisky.abv}"`,
      `"${whisky.rating}"`,
      `"${whisky.price}"`,
      `"${whisky.notes}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `whisky_journal_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Group mb="xl" justify="space-between">
        <Group gap="xs">
          <Title>Cam&apos;s whisky journal</Title>
          <Tooltip
            label="Whisky rating scales"
            openDelay={250}
            position="right"
            offset={5}
          >
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Open modal detailing whisky rating scales"
              onClick={() => setModalScalesOpened(true)}
            >
              <IconInfoCircle />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Button
          variant="default"
          component="a"
          href="/admin/whiskyjournal/add"
          leftSection={<IconPlus />}
        >
          Add new whisky
        </Button>
      </Group>

      <Modal
        size="auto"
        opened={modalScalesOpened}
        onClose={() => setModalScalesOpened(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whisky_scales"
        withCloseButton={false}
        transitionProps={{
          transition: "fade",
          duration: 300,
          timingFunction: "linear",
        }}
        overlayProps={{
          backgroundOpacity: 0.75,
          blur: 3,
        }}
      >
        <Container>
          <Title order={2} mb="sm" id="whisky_scales">
            Whisky rating scales
          </Title>

          <Title order={3} mt="lg" mb="sm">
            Pricing scale
          </Title>

          <WhiskyPricingScale />

          <Title order={3} mt="lg" mb="sm">
            Rating scale
          </Title>

          <WhiskyRatingScale />

          <Center>
            <Button
              variant="subtle"
              mt="md"
              onClick={() => setModalScalesOpened(false)}
            >
              Close modal
            </Button>
          </Center>
        </Container>
      </Modal>

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
                label="Price"
                placeholder="Select price range"
                data={[
                  { value: "1", label: "Under £40 a bottle" },
                  { value: "2", label: "£40 - £85 a bottle" },
                  { value: "3", label: "Over £85 a bottle" },
                ]}
                value={priceFilter}
                onChange={setPriceFilter}
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

      <Group justify="space-between">
        <TextInput
          mb="md"
          aria-label="Search whisky names"
          placeholder="Search whisky names..."
          value={searchQuery}
          onChange={handleSearch}
          style={{ flex: 1, minWidth: 100 }}
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

        <Button
          onClick={exportToCSV}
          mb="md"
          variant="default"
          leftSection={<IconDownload />}
        >
          Download CSV
        </Button>
      </Group>

      <Text m="sm">
        Showing {searchedWhiskyData.length} of {whiskyData.length} whiskies
      </Text>

      {searchedWhiskyData.map((whisky) => (
        <div key={whisky.whisky_id}>
          <WhiskyCard {...whisky} />
        </div>
      ))}
      <BackToTop />
    </>
  );
}

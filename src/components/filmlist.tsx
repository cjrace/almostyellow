"use client";

import {
  Select,
  Button,
  Group,
  Text,
  Accordion,
  Stack,
  Progress,
  TextInput,
  ActionIcon,
} from "@mantine/core";
import { FilmCard, Film } from "@/components/filmcard";
import { useState, useEffect } from "react";
import BackToTop from "@/components/backtotop";
import { readFilmList } from "@/services/filmlist";
import { useClipboard } from "@mantine/hooks";
import { IconCopy, IconDownload, IconX } from "@tabler/icons-react";

export default function FilmList() {
  const clipboard = useClipboard({ timeout: 500 });
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilms = async () => {
      try {
        console.log("Requesting new data");
        const data = await readFilmList();
        console.log("Data fetch successful");
        setFilms(data);
      } catch (error) {
        console.error("Error fetching films:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilms();
  }, []);

  const [imdbFilter, setImdbFilter] = useState<boolean | null>(null);
  const [watchedFilter, setWatchedFilter] = useState<boolean | null>(null);
  const [jarFilter, setJarFilter] = useState<boolean | null>(null);

  const [sortOption, setSortOption] = useState<string | null>(null);

  const filteredFilmData = films.filter((film) => {
    return (
      (imdbFilter === null || film.top_30 === imdbFilter) &&
      (watchedFilter === null || film.watched === watchedFilter) &&
      (jarFilter === null || !film.not_in_jar === jarFilter)
    );
  });

  const sortedFilmData = [...filteredFilmData].sort((a, b) => {
    switch (sortOption) {
      case "alphabetical":
        return a.name.localeCompare(b.name);
      case "releaseAsc":
        return a.release_year - b.release_year;
      case "releaseDesc":
        return b.release_year - a.release_year;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const searchedFilmData = sortedFilmData.filter((film) =>
    film.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const imdbOptions = [
    { value: "true", label: "Top 30" },
    { value: "false", label: "Not top 30" },
  ];
  const watchedOptions = [
    { value: "true", label: "Watched" },
    { value: "false", label: "Not watched" },
  ];
  const jarOptions = [
    { value: "true", label: "Has been in jar" },
    { value: "false", label: "Needs adding to jar" },
  ];

  const clearAllFilters = () => {
    setImdbFilter(null);
    setWatchedFilter(null);
    setJarFilter(null);
    setSortOption("alphabetical");
    setSearchQuery("");
  };

  const sortOptions = [
    { value: "alphabetical", label: "Alphabetical A-Z" },
    { value: "releaseAsc", label: "Release year ascending" },
    { value: "releaseDesc", label: "Release year descending" },
  ];

  if (loading) {
    return <Text>Fetching list...</Text>;
  }

  const film_count = searchedFilmData.length;
  const watched_film_count = searchedFilmData.filter(
    (film) => film.watched,
  ).length;
  const watched_film_percentage = (watched_film_count / film_count) * 100;

  const copyToClipboard = () => {
    const filmNameList = searchedFilmData
      .map((film) => `${film.name} (${film.release_year})`)
      .join("\n");
    clipboard.copy(filmNameList);
  };

  const downloadCSV = () => {
    const csvContent = [
      ["Name", "Release Year", "Watched", "Top 30", "In Jar"],
      ...searchedFilmData.map((film) => [
        `"${film.name.replace(/"/g, '""')}"`,
        film.release_year,
        film.watched ? "Yes" : "No",
        film.top_30 ? "Yes" : "No",
        film.not_in_jar ? "No" : "Yes",
      ]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `films_${today}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Accordion variant="contained" my="md">
        <Accordion.Item value="Sort and filter">
          <Accordion.Control>Sort and filter</Accordion.Control>
          <Accordion.Panel>
            <Group mb="md">
              <Select
                label="IMDB top 30"
                data={imdbOptions}
                value={imdbFilter !== null ? imdbFilter.toString() : null}
                onChange={(value) =>
                  setImdbFilter(
                    value === "true" ? true : value === "false" ? false : null,
                  )
                }
                clearable
              />
              <Select
                label="Watched"
                data={watchedOptions}
                value={watchedFilter !== null ? watchedFilter.toString() : null}
                onChange={(value) =>
                  setWatchedFilter(
                    value === "true" ? true : value === "false" ? false : null,
                  )
                }
                clearable
              />
              <Select
                label="In jar"
                data={jarOptions}
                value={jarFilter !== null ? jarFilter.toString() : null}
                onChange={(value) =>
                  setJarFilter(
                    value === "true" ? true : value === "false" ? false : null,
                  )
                }
                clearable
              />

              <Select
                label="Sort by"
                placeholder="Select sorting option"
                data={sortOptions}
                value={sortOption !== null ? sortOption : "alphabetical"} // Default value set to "alphabetical"
                onChange={setSortOption}
                clearable
              />
            </Group>
            <Group justify="flex-end">
              <Button onClick={clearAllFilters} size="md" variant="outline">
                Clear all filters
              </Button>
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Stack mb="lg">
        {watched_film_percentage === 100 ? (
          <Text>All films watched!</Text>
        ) : (
          <Text>
            {watched_film_count} of {film_count} films watched
          </Text>
        )}
        <Progress
          aria-label="Number of films watched"
          color="orange"
          radius="xl"
          size="xl"
          value={watched_film_percentage}
        />
      </Stack>

      <Group mb="md" justify="space-between">
        <TextInput
          aria-label="Search film titles"
          placeholder="Search film titles..."
          value={searchQuery}
          onChange={handleSearch}
          style={{ flex: 1 }}
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

        <Group>
          <Button
            onClick={() => {
              copyToClipboard();
              setTimeout(() => clipboard.reset(), 500);
            }}
            variant="default"
            leftSection={<IconCopy />}
          >
            {clipboard.copied ? "Copied" : "Copy film names to clipboard"}
          </Button>
          <Button
            onClick={downloadCSV}
            variant="default"
            leftSection={<IconDownload />}
          >
            Download CSV
          </Button>
        </Group>
      </Group>

      {searchedFilmData.map((film) => (
        <div key={film.id}>
          <FilmCard {...film} />
        </div>
      ))}

      <BackToTop />
    </>
  );
}

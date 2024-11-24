"use client";

import { filmData, FilmCard } from "@/components/filmcard";
import { Container } from "@mantine/core";

export default function FilmList() {
  return (
    <>
      {filmData.map((film) => (
        <div key={film.name}>
          <FilmCard {...film} />
        </div>
      ))}
    </>
  );
}

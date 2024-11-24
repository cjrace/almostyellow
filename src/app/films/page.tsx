import { Metadata } from "next";
import Header from "@/components/header";
import { Container, Title } from "@mantine/core";
import FilmList from "@/components/filmlist";

export const metadata: Metadata = {
  title: "Films Journal",
  description:
    "Films to see before I'm 30. Top 30 from IMDB and other recommendations.",
  openGraph: {
    title: "Films | Almost Yellow",
    description:
      "Films to see before I'm 30. Top 30 from IMDB and other recommendations.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Films", href: "" },
];

export default function FilmsPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <Title mb="lg">Cam&apos;s film list</Title>
          <FilmList />
        </Container>
      </main>
    </>
  );
}

import { Metadata } from "next";
import Header from "@/components/header";
import ButtonLink from "@/components/buttonlink";
import { Container, Group, Title } from "@mantine/core";
import FilmList from "@/components/filmlist";
import { IconPlus } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Films",
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
          <Group justify="space-between">
            <Title mb="lg">Cam&apos;s film list</Title>
            <ButtonLink
              leftSection={<IconPlus />}
              variant="default"
              href="/admin/films/add"
            >
              Add new film
            </ButtonLink>
          </Group>

          <FilmList />
        </Container>
      </main>
    </>
  );
}

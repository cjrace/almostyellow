import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import { Container, Group, Title, Button } from "@mantine/core";
import FilmList from "@/components/filmlist";
import { IconPlus } from "@tabler/icons-react";
import { connection } from "next/server";
import { readFilmList } from "@/services/filmlist";

export const metadata = pageMetadata(
  "Films",
  "Films to see before I'm 30. Top 30 from IMDB and other recommendations.",
);

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Films", href: "" },
];

export default async function FilmsPage() {
  // Read the list on each request, so changes show without a rebuild
  await connection();
  const films = await readFilmList();

  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <Group justify="space-between">
            <Title mb="lg">Cam&apos;s film list</Title>
            <Button
              leftSection={<IconPlus />}
              variant="default"
              component="a"
              href="/admin/films/add"
            >
              Add new film
            </Button>
          </Group>

          <FilmList films={films} />
        </Container>
      </main>
    </>
  );
}

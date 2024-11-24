import { Metadata } from "next";
import Header from "@/components/header";
import {
  Container,
  Group,
  Title,
  Button,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import FilmList from "@/components/filmlist";
import { IconPlus } from "@tabler/icons-react";

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
          <Group justify="space-between">
            {" "}
            <Title mb="lg">Cam&apos;s film list</Title>
            <Button
              leftSection={<IconPlus />}
              variant="default"
              component="a"
              href="/admin/film/add"
            >
              Add new film
            </Button>
          </Group>

          <Stack mb="lg">
            <Text>60 of 100 films watched</Text>
            <Progress
              aria-label="Films watched from list"
              color="orange"
              radius="xl"
              size="xl"
              value={60}
            />
          </Stack>

          <FilmList />
        </Container>
      </main>
    </>
  );
}

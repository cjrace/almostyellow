"use client";

import {
  TextInput,
  Button,
  Paper,
  Container,
  Title,
  Group,
  Modal,
  Text,
  Checkbox,
  NumberInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { deleteFilm, updateFilm } from "@/services/filmlist";
import { Film } from "@/components/filmcard";
import { useRouter } from "next/navigation";

export const FilmListEdit = ({ filmData }: { filmData: Film }) => {
  const [modalOpened, setModalOpened] = useState(false);
  const router = useRouter();

  interface FilmFormValues {
    name: string;
    release_year: string;
    top_30: boolean;
    watched: boolean;
    not_in_jar: boolean;
  }

  interface FilmFormValidation {
    name: (value: string) => string | null;
    release_year: (value: string) => string | null;
    watched: (value: boolean) => string | null;
    imdb_top30: (value: boolean) => string | null;
    not_in_jar: (value: boolean) => string | null;
  }

  const form = useForm<FilmFormValues>({
    initialValues: {
      name: filmData.name,
      release_year: filmData.release_year.toString(),
      top_30: filmData.top_30,
      watched: filmData.watched,
      not_in_jar: filmData.not_in_jar,
    },

    validate: {
      name: (value: string) => (value ? null : "Film title is required"),
      release_year: (value: string) => {
        if (!/^\d{4}$/.test(value)) {
          return "Release year must be a four-digit number";
        }
        if (parseInt(value) > new Date().getFullYear() + 1) {
          return "Release year cannot be more than one year into the future";
        }
        return null;
      },
      watched: (value: boolean) =>
        typeof value === "boolean"
          ? null
          : "Watched is a required boolean value",
      top_30: (value: boolean) =>
        typeof value === "boolean"
          ? null
          : "IMDB top 30 is a required boolean value",
      not_in_jar: (value: boolean) =>
        typeof value === "boolean"
          ? null
          : "Not in jar is a required boolean value",
    },
  });

  const handleDelete = async () => {
    console.log("Deleting film:", filmData.id);
    await deleteFilm(filmData.id);
    router.push("/films");
  };

  const handleSubmit = async (values: typeof form.values) => {
    console.log("Updated film data:", values);
    await updateFilm({
      id: filmData.id,
      ...values,
      release_year: parseInt(values.release_year),
    });
    router.push("/films");
  };

  return (
    <Container size="md" my={40}>
      <Group justify="space-between">
        <Title>Edit Film</Title>
        <Button color="red" onClick={() => setModalOpened(true)} size="md">
          Delete Film
        </Button>
      </Group>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Confirm Deletion"
      >
        <Text>ID: {filmData.id}</Text>
        <Text>Name: {filmData.name}</Text>
        <Text>Are you sure you want to delete this Film?</Text>
        <Group mt="md">
          <Button variant="default" onClick={() => setModalOpened(false)}>
            Cancel deletion
          </Button>
          <Button color="red" onClick={handleDelete}>
            Confirm deletion
          </Button>
        </Group>
      </Modal>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            mb="md"
            label="Film title"
            withAsterisk
            description="Try to match exactly with IMDB"
            {...form.getInputProps("name")}
          />

          <NumberInput
            mb="md"
            withAsterisk
            label="Year the film was released"
            description="Try to match exactly with IMDB"
            rightSection={" "} // remove the up down arrows
            clampBehavior="strict"
            {...form.getInputProps("release_year")}
          />

          <Checkbox
            mb="md"
            label="This film is a part of the top 30 list from IMDB"
            color="orange"
            radius="xl"
            checked={form.values.top_30}
            {...form.getInputProps("top_30")}
          />

          <Checkbox
            mb="md"
            label="I have watched this film"
            color="orange"
            radius="xl"
            checked={form.values.watched}
            {...form.getInputProps("watched")}
          />

          <Checkbox
            mb="md"
            label="This film has not yet been added into the jar"
            color="orange"
            radius="xl"
            checked={form.values.not_in_jar}
            {...form.getInputProps("not_in_jar")}
          />

          <Button type="submit" fullWidth mt="md">
            Update Film
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

"use client";

import {
  TextInput,
  Button,
  Checkbox,
  Paper,
  Container,
  Title,
  NumberInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { createFilm } from "@/services/filmlist";
import { v4 as generate_uuid } from "uuid";

export const FilmAdd = () => {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      id: generate_uuid(),
      name: "",
      release_year: 1066,
      watched: false,
      top_30: false,
      not_in_jar: false,
    },

    validate: {
      name: (value) => (value ? null : "Film title is required"),
      release_year: (value) => {
        if (!/^\d{4}$/.test(value.toString())) {
          return "Release year must be a four-digit number";
        }
        if (parseInt(value.toString()) > new Date().getFullYear() + 1) {
          return "Release year cannot be more than one year into the future";
        }
        return null;
      },
      watched: (value) =>
        typeof value === "boolean"
          ? null
          : "Watched is a required boolean value",
      top_30: (value) =>
        typeof value === "boolean"
          ? null
          : "IMDB top 30 is a required boolean value",
      not_in_jar: (value) =>
        typeof value === "boolean"
          ? null
          : "Not in jar is a required boolean value",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    await createFilm(values);
    router.push("/films");
  };

  return (
    <Container size="lg" my={40}>
      <Title>Add a new film to the jar</Title>

      <Paper>
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
            size="xl"
            {...form.getInputProps("top_30")}
          />

          <Checkbox
            mb="md"
            label="I have watched this film"
            color="orange"
            radius="xl"
            size="xl"
            {...form.getInputProps("watched")}
          />

          <Checkbox
            mb="md"
            label="This film has not yet been added into the jar"
            color="orange"
            radius="xl"
            size="xl"
            {...form.getInputProps("not_in_jar")}
          />

          <Button type="submit">Add film</Button>
        </form>
      </Paper>
    </Container>
  );
};

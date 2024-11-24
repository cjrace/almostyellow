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

export const FilmAdd: React.FC = () => {
  const form = useForm({
    initialValues: {
      name: "",
      release_year: "",
      watched: false,
      imdb_top30: false,
    },
  });

  const handleFormSubmit = async () => {
    const { name, release_year, watched, imdb_top30 } = form.values;
    const formData = new FormData();
    formData.append("name", name);
    formData.append("release_year", release_year);
    // formData.append("watched", watched);
    // formData.append("imdb_top30", imdb_top30);

    // Do server function - ? formAction(formData);
    // Redirect to main films page
  };

  return (
    <Container size="lg" my={40}>
      <Title>Add a new film to the jar</Title>

      <Paper>
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <TextInput
            mb="md"
            label="Film title"
            withAsterisk
            description="Try to match exactly with IMDB"
          />

          <NumberInput
            mb="md"
            withAsterisk
            label="Year the film was released"
            description="Try to match exactly with IMDB"
            rightSection={" "} // remove the up down arrows
            max={new Date().getFullYear() + 1} // Don't allow anything more than one year into the future
            clampBehavior="strict"
          />
          <Checkbox
            mb="md"
            label="This film is a part of the top 30 list from IMDB"
            color="orange"
            radius="xl"
            size="xl"
          />
          <Checkbox
            mb="md"
            label="I have watched this film"
            color="orange"
            radius="xl"
            size="xl"
          />

          <Button type="submit">Add film</Button>
        </form>
      </Paper>
    </Container>
  );
};

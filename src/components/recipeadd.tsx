"use client";

import {
  TextInput,
  Button,
  Paper,
  Container,
  Title,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { createRecipe } from "@/services/recipelist";
import { v4 as generate_uuid } from "uuid";

export const RecipeAdd = () => {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      id: generate_uuid(),
      name: "",
      photoUrl: "/images/recipe-placeholder.svg",
      ingredientsText: "",
      instructionsText: "",
    },

    validate: {
      name: (value) => (value ? null : "Recipe name is required"),
      photoUrl: (value) => (value ? null : "Photo URL is required"),
      ingredientsText: (value) =>
        value.trim() ? null : "At least one ingredient is required",
      instructionsText: (value) =>
        value.trim() ? null : "At least one instruction is required",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    await createRecipe({
      id: values.id,
      name: values.name,
      photoUrl: values.photoUrl,
      ingredients: values.ingredientsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      instructions: values.instructionsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
    router.push("/recipes");
  };

  return (
    <Container size="lg" my={40}>
      <Title>Add a new recipe</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            mb="lg"
            label="Recipe name"
            placeholder="Enter recipe name"
            withAsterisk
            {...form.getInputProps("name")}
          />

          <TextInput
            mb="lg"
            label="Photo URL"
            description="Path to an image in /public/images, e.g. /images/recipe-placeholder.svg"
            withAsterisk
            {...form.getInputProps("photoUrl")}
          />

          <Textarea
            mb="lg"
            label="Ingredients"
            description="One ingredient per line"
            autosize
            minRows={4}
            withAsterisk
            {...form.getInputProps("ingredientsText")}
          />

          <Textarea
            mb="lg"
            label="Instructions"
            description="One step per line"
            autosize
            minRows={4}
            withAsterisk
            {...form.getInputProps("instructionsText")}
          />

          <Button type="submit">Add recipe</Button>
        </form>
      </Paper>
    </Container>
  );
};

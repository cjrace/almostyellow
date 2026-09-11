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
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { deleteRecipe, updateRecipe } from "@/services/recipelist";
import { Recipe } from "@/components/recipebox";
import { useRouter } from "next/navigation";

export const RecipeEdit = ({ recipeData }: { recipeData: Recipe }) => {
  const [modalOpened, setModalOpened] = useState(false);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      name: recipeData.name,
      photoUrl: recipeData.photoUrl,
      ingredientsText: recipeData.ingredients.join("\n"),
      instructionsText: recipeData.instructions.join("\n"),
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

  const handleDelete = async () => {
    await deleteRecipe(recipeData.id);
    router.push("/recipes");
  };

  const handleSubmit = async (values: typeof form.values) => {
    await updateRecipe({
      id: recipeData.id,
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
    <Container size="md" my={40}>
      <Group justify="space-between">
        <Title>Edit recipe</Title>
        <Button
          color="red"
          onClick={() => {
            setModalOpened(true);
          }}
          size="md"
        >
          Delete recipe
        </Button>
      </Group>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
        }}
        title="Confirm Deletion"
      >
        <Text>Name: {recipeData.name}</Text>
        <Text>Are you sure you want to delete this recipe?</Text>
        <Group mt="md">
          <Button
            variant="default"
            onClick={() => {
              setModalOpened(false);
            }}
          >
            Cancel deletion
          </Button>
          <Button
            color="red"
            onClick={() => {
              void handleDelete();
            }}
          >
            Confirm deletion
          </Button>
        </Group>
      </Modal>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            mb="lg"
            label="Recipe name"
            withAsterisk
            {...form.getInputProps("name")}
          />

          <TextInput
            mb="lg"
            label="Photo URL"
            description="Path to an image in /public/images"
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

          <Button type="submit" fullWidth mt="md">
            Update recipe
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

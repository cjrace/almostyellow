"use client";

import {
  TextInput,
  Button,
  Paper,
  Container,
  Title,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Rating,
  Select,
  NumberInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { deleteWhisky, updateWhisky } from "@/services/whiskyjournal";
import { Whisky } from "@/components/whiskycard";
import { useRouter } from "next/navigation";
import { IconTaxPound } from "@tabler/icons-react";
import {
  WhiskyPricingScale,
  WhiskyRatingScale,
} from "@/components/whiskyscoringscales";

export const WhiskyJournalEdit = ({ whiskyData }: { whiskyData: Whisky }) => {
  const [modalOpened, setModalOpened] = useState(false);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      last_edited: whiskyData.last_edited.toISOString(),
      whisky_id: whiskyData.whisky_id,
      name: whiskyData.name,
      distillery: whiskyData.distillery,
      country_region: whiskyData.country_region,
      age: whiskyData.age,
      grain: whiskyData.grain,
      abv: whiskyData.abv,
      rating: whiskyData.rating,
      price: whiskyData.price,
      notes: whiskyData.notes,
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
      distillery: (value) => (value ? null : "Distillery is required"),
      country_region: (value) =>
        value ? null : "Country or region is required",
      age: (value) =>
        value >= 0 ? null : "Age must be greater than or equal to zero",
      grain: (value) =>
        ["Single malt", "Rye", "Bourbon", "Blend"].includes(value)
          ? null
          : "Grain must be one of 'Single malt', 'Rye', 'Bourbon', or 'Blend'",
      abv: (value) =>
        value >= 0 && value <= 100
          ? null
          : "ABV must be greater than or equal to zero and less than or equal to 100",
      rating: (value) =>
        value >= 1 && value <= 5 ? null : "Rating must be between 1 and 5",
      price: (value) =>
        value >= 1 && value <= 3 ? null : "Price must be between 1 and 3",
      notes: (value) => (value ? null : "Notes are required"),
    },
  });

  const handleDelete = async () => {
    console.log("Deleting whisky with ID:", whiskyData.whisky_id);
    await deleteWhisky(whiskyData.whisky_id);
    router.push("/whiskyjournal");
  };

  const handleSubmit = async (values: typeof form.values) => {
    console.log("Updated whisky data:", values);
    await updateWhisky({
      ...values,
      last_edited: new Date(values.last_edited),
    });
    router.push("/whiskyjournal");
  };

  return (
    <Container size="md" my={40}>
      <Group justify="space-between">
        <Title>Edit Whisky</Title>
        <Button
          color="red"
          onClick={() => {
            setModalOpened(true);
          }}
          size="md"
        >
          Delete Whisky
        </Button>
      </Group>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
        }}
        title="Confirm Deletion"
      >
        <Text>Whisky ID: {whiskyData.whisky_id}</Text>
        <Text>Name: {whiskyData.name}</Text>
        <Text>Are you sure you want to delete this whisky?</Text>
        <Group mt="md">
          <Button
            variant="default"
            onClick={() => {
              setModalOpened(false);
            }}
          >
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
            mb="lg"
            label="Name"
            placeholder="Enter whisky name"
            {...form.getInputProps("name")}
            withAsterisk
          />
          <TextInput
            mb="lg"
            label="Distillery"
            placeholder="Enter distillery name"
            {...form.getInputProps("distillery")}
            withAsterisk
          />
          <TextInput
            mb="lg"
            label="Country (plus region if Scotland)"
            placeholder="Enter country or region"
            {...form.getInputProps("country_region")}
            withAsterisk
          />
          <NumberInput
            mb="lg"
            label="Age"
            placeholder="Enter age"
            {...form.getInputProps("age")}
            withAsterisk
          />
          <Select
            mb="lg"
            label="Grain"
            placeholder="Select grain"
            data={["Single malt", "Rye", "Bourbon", "Blend"]}
            {...form.getInputProps("grain")}
            withAsterisk
          />
          <NumberInput
            mb="lg"
            label="ABV"
            placeholder="Enter ABV"
            {...form.getInputProps("abv")}
            withAsterisk
          />
          <Stack>
            <Text fw={500}>
              Rate the whisky out of 5<span style={{ color: "red" }}> *</span>
            </Text>

            <WhiskyRatingScale />

            <Rating mb="lg" {...form.getInputProps("rating")} />
          </Stack>
          <Stack>
            <Text fw={500}>
              How pricey is the whisky?
              <span style={{ color: "red" }}> *</span>
            </Text>

            <WhiskyPricingScale />

            <Rating
              mb="lg"
              size="xl"
              count={3}
              emptySymbol={
                <IconTaxPound size="2rem" style={{ opacity: 0.2 }} />
              }
              fullSymbol={<IconTaxPound size="2rem" />}
              {...form.getInputProps("price")}
            />
          </Stack>
          <Textarea
            mb="lg"
            label="Notes"
            placeholder="Enter notes"
            {...form.getInputProps("notes")}
            withAsterisk
          />
          <Button type="submit" fullWidth mt="md">
            Update Whisky
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

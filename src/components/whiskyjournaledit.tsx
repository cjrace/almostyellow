"use client";

import {
  TextInput,
  Button,
  Paper,
  Container,
  Title,
  NumberInput,
  Select,
  Rating,
  Stack,
  Text,
  Textarea,
  List,
  Group,
  Modal,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { v4 as generate_uuid } from "uuid";
import { IconTaxPound } from "@tabler/icons-react";
import {
  WhiskyPricingScale,
  WhiskyRatingScale,
} from "@/components/whiskyscoringscales";

// Mock function to fetch whisky data by ID
const fetchWhiskyById = async (id: string) => {
  // Replace with actual API call
  return {
    whisky_id: id,
    name: "Sample Whisky",
    distillery: "Sample Distillery",
    country_region: "Scotland",
    age: 12,
    grain: "Single malt",
    abv: 40,
    last_edited: new Date(),
    rating: 4,
    price: 2,
    notes: "Sample notes",
  };
};

export const WhiskyJournalEdit = ({ whisky_id }: { whisky_id: string }) => {
  const [modalOpened, setModalOpened] = useState(false);

  const form = useForm({
    initialValues: {
      whisky_id: generate_uuid(),
      name: "",
      distillery: "",
      country_region: "",
      age: 0,
      grain: "",
      abv: 0,
      last_edited: new Date(), // remember to update again when submitting
      rating: 0,
      price: 0,
      notes: "",
    },

    validate: {
      name: (value) => (value ? null : "Name is required"),
      distillery: (value) => (value ? null : "Distillery is required"),
      country_region: (value) =>
        value ? null : "Country or region is required",
      age: (value) =>
        value >= 0 ? null : "Age must be greater than or equal to zero",
      grain: (value) =>
        ["Single malt", "Rye", "Bourbon", "blend"].includes(value)
          ? null
          : "Grain must be one of 'Single malt', 'Rye', 'Bourbon', or 'blend'",
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

  useEffect(() => {
    const loadWhiskyData = async () => {
      const whiskyData = await fetchWhiskyById(whisky_id);
      form.setValues(whiskyData);
    };

    loadWhiskyData();
  }, [whisky_id, form]);

  const handleDelete = async () => {
    console.log("Deleting whisky:", whisky_id);
    // Add your delete logic here (e.g., API call to delete the whisky)
    setModalOpened(false);
  };

  const handleSubmit = (values: typeof form.values) => {
    values.last_edited = new Date(); // Force update to today's date at time of submission
    console.log("Updated whisky data:", values);
    // Add your update logic here (e.g., API call to update the whisky)
  };

  return (
    <Container size="md" my={40}>
      <Group justify="space-between">
        <Title>Edit Whisky</Title>
        <Button
          color="red"
          onClick={() => {
            console.log("Button clicked");
            setModalOpened(true);
          }}
          size="md"
        >
          Delete Whisky
        </Button>
      </Group>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Confirm Deletion"
      >
        <Text>Whisky ID: {whisky_id}</Text>
        <Text>Are you sure you want to delete this whisky?</Text>
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
            label="Country/Region"
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
              Rate the whisky
              <span style={{ color: "red" }}> *</span>
            </Text>

            <WhiskyRatingScale />

            <Rating mb="lg" size="xl" {...form.getInputProps("rating")} />
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

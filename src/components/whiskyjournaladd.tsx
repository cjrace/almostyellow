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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { v4 as generate_uuid } from "uuid";
import { IconTaxPound } from "@tabler/icons-react";
import {
  WhiskyPricingScale,
  WhiskyRatingScale,
} from "@/components/whiskyscoringscales";
import { createWhisky } from "@/services/whiskyjournal";

export const WhiskyJournalAdd = () => {
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
      price: (value) =>
        value >= 1 && value <= 3 ? null : "Price must be between 1 and 3",
      rating: (value) =>
        value >= 1 && value <= 5 ? null : "Rating must be between 1 and 5",
      notes: (value) => (value ? null : "Notes are required"),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    values.last_edited = new Date(); // Force update to today's date
    console.log("Form data:", values);
  };

  return (
    <Container size="lg" my={40}>
      <Title>Add a new whisky</Title>

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

          <Button type="submit">Add whisky</Button>
        </form>
      </Paper>
    </Container>
  );
};

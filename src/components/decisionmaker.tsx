"use client";

import { useState } from "react";
import { Textarea, Button, SimpleGrid, Stack, Text } from "@mantine/core";
import { useForm, Form } from "@mantine/form";
import classes from "@/styles/textarea.module.css";
import playConfetti from "@/components/playconfetti";

type DecisionOptions = {
  options: string;
};

export default function DecisionMaker() {
  const [chosenOption, setChosenItem] = useState<string | null>(null);
  const error = useState("");

  const form = useForm<DecisionOptions>({
    initialValues: { options: "" },
    validate: {
      options: (value) => {
        const lineCount = value.trim().split(/\n+/).length;
        if (lineCount < 2) {
          return "Please enter at least 2 options.";
        }
        return null;
      },
    },
  });

  const makeDecision = (data: DecisionOptions) => {
    const options = data.options
      .split("\n")
      .filter((option) => option.trim() !== "");
    if (options.length > 0) {
      const randomIndex = Math.floor(Math.random() * options.length);
      setChosenItem(options[randomIndex]);
      playConfetti();
    }
  };

  return (
    <SimpleGrid spacing="xl" cols={{ base: 1, sm: 2 }}>
      <Form form={form} onSubmit={makeDecision}>
        <Textarea
          label="List out your options"
          placeholder="One option per line..."
          error={error}
          autosize
          minRows={5}
          classNames={{ label: classes.label }} // Add an extra space before the text area box
          {...form.getInputProps("options")}
        />
        <Button mt="xl" type="submit" fullWidth>
          Make a decision
        </Button>
      </Form>

      {chosenOption && (
        <Stack>
          <Text ta="center" size="xl">
            The decision has been made, you choose...
          </Text>
          <Text ta="center" size="xl">
            <span data-testid="choice_made">{chosenOption}</span>
          </Text>
        </Stack>
      )}
    </SimpleGrid>
  );
}

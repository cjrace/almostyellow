"use client";

import { useState } from "react";
import {
  Textarea,
  Button,
  SimpleGrid,
  Stack,
  Text,
  Group,
} from "@mantine/core";
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

  const [isLoading, setIsLoading] = useState(false);

  const makeDecision = (data: DecisionOptions) => {
    setIsLoading(true);

    setTimeout(() => {
      const options = data.options
        .split("\n")
        .filter((option) => option.trim() !== "");
      if (options.length > 0) {
        const randomIndex = Math.floor(Math.random() * options.length);
        setChosenItem(options[randomIndex]);
        playConfetti();
      }

      setIsLoading(false);
    }, 3000);
  };

  const prePopulateTakeaways = () => {
    const prepopulatedTakeaways = `KFC
McDonalds
Nandos
Subway
Dominos
Bella Italia
Picco
Shake n Cake
Toby Carvery
North Road Fish Bar
New Leung Kee
Star of Bengal
Bombay Gate
Manjaros
Santorini`;

    form.setFieldValue("options", prepopulatedTakeaways);
  };

  const prePopulateNames = () => {
    const prepopulatedNames = `Cam
Laura`;

    form.setFieldValue("options", prepopulatedNames);
  };

  return (
    <SimpleGrid spacing="xl" cols={{ base: 1, sm: 2 }}>
      <Form form={form} onSubmit={makeDecision}>
        <Group>
          <Button mb="md" variant="default" onClick={prePopulateTakeaways}>
            Darlington Takeaways
          </Button>
          <Button mb="md" variant="default" onClick={prePopulateNames}>
            Our names
          </Button>
        </Group>

        <Textarea
          classNames={{ label: classes.label, input: classes.input }}
          label="List out your options"
          placeholder="One option per line..."
          error={error}
          autosize
          minRows={2}
          {...form.getInputProps("options")}
        />
        <Button mt="xl" type="submit" fullWidth disabled={isLoading}>
          {isLoading ? "Pondering choices..." : "Make a decision"}
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

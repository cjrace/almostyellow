"use client";

import { useState } from "react";
import {
  Textarea,
  Button,
  Grid,
  Breadcrumbs,
  Anchor,
  Container,
} from "@mantine/core";
import { useForm, Form } from "@mantine/form";
import classes from "@/styles/textarea.module.css";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Decision maker", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

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
    }
  };

  return (
    <div>
      <Grid grow>
        <Grid.Col span={12}>
          <Breadcrumbs>{crumbitems}</Breadcrumbs>
          <h1 style={{ textAlign: "center" }}>The Decision Maker</h1>
        </Grid.Col>

        <Grid.Col span={5}>
          <Container>
            <Form form={form} onSubmit={makeDecision}>
              <Textarea
                label="List out your options"
                placeholder="One option per line..."
                error={error}
                rows={5}
                classNames={{ label: classes.label }} // Add an extra space before the text area box
                {...form.getInputProps("options")}
              />
              <br />
              <Button type="submit" fullWidth>
                Make a decision
              </Button>
            </Form>
          </Container>
        </Grid.Col>

        <Grid.Col span={7}>
          {chosenOption && (
            <div
              id="decision"
              style={{ fontSize: "24px", textAlign: "center" }}
            >
              <p>The decision has been made, you choose...</p>
              {chosenOption}
            </div>
          )}
        </Grid.Col>
      </Grid>
    </div>
  );
}

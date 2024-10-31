import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Textarea, Button, Grid, Breadcrumbs, Anchor } from "@mantine/core";
import styles from "../app/page.module.css";

// TODO: Make the decision clear if text is entered into the box

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Decision maker", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

type decisionOptions = {
  options: string;
};

const DecisionMaker: React.FC = () => {
  const { register, handleSubmit, setValue } = useForm<decisionOptions>();
  const [decidedOption, setChosenItem] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateInput = (value: string) => {
    const lineCount = value.trim().split(/\n+/).length;
    if (lineCount < 2) {
      setError("Please enter at least 2 options.");
      return false;
    } else {
      setError("");
      return true;
    }
  };

  const makeDecision: SubmitHandler<decisionOptions> = (data) => {
    const options = data.options
      .split("\n")
      .filter((option) => option.trim() !== "");
    if (options.length > 0) {
      const randomIndex = Math.floor(Math.random() * options.length);
      setChosenItem(options[randomIndex]);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div>
          <Grid grow>
            <Grid.Col span={12}>
              <Breadcrumbs>{crumbitems}</Breadcrumbs>
              <h1 style={{ textAlign: "center" }}>The Decision Maker</h1>
            </Grid.Col>

            <Grid.Col span={5}>
              <div style={{ margin: 20 }}>
                <form
                  onSubmit={handleSubmit((data) => {
                    setIsSubmitted(true);
                    if (validateInput(data.options)) {
                      makeDecision(data);
                    }
                  })}
                >
                  <Textarea
                    {...register("options")}
                    label="Type the options for your decision, one per line..."
                    error={error}
                    autosize
                    minRows={5}
                    maxRows={20}
                    onChange={(e) => {
                      setValue("options", e.target.value);
                      if (isSubmitted) {
                        validateInput(e.target.value);
                      }
                    }}
                  />
                  <br></br>
                  <Button type="submit" fullWidth>
                    Make a decision
                  </Button>
                </form>
                <br></br>
              </div>
            </Grid.Col>

            <Grid.Col span={7}>
              {decidedOption && (
                <div
                  id="decision"
                  style={{ fontSize: "24px", textAlign: "center" }}
                >
                  <p>The decision has been made, and you should choose:</p>
                  {decidedOption}
                </div>
              )}
            </Grid.Col>
          </Grid>
        </div>

        <div>
          <Button leftSection="🏠" variant="default" component="a" href="/">
            Back to homepage
          </Button>
        </div>
      </main>
    </div>
  );
};

export default DecisionMaker;

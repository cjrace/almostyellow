import React, { useState } from "react";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { Textarea, Button, Grid } from "@mantine/core";

// TODO: Make the decision clear if text is entered into the box
// TODO: Add a validation error when pressing the button if only one line of text or less is present in the box

type decisionOptions = {
  options: string;
};

const DecisionMaker: React.FC = () => {
  const { register, handleSubmit } = useForm<decisionOptions>();
  const [decidedOption, setChosenItem] = useState<string | null>(null);
  const [error, setError] = useState('');

  const validateInput = (value: string) => {
    const wordCount = value.trim().split(/\s+/).length;
    if (wordCount < 2) {
      setError('Please enter at least 2 words.');
      return false
    } else {
      setError('');
      return true
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
    <Grid grow>
      <Grid.Col span={12}>
        <h1 style={{ textAlign: "center" }}>The Decision Maker</h1>
      </Grid.Col>

      <Grid.Col span={5}>
        <div style={{ margin: 20 }}>
          <form
            onSubmit={handleSubmit((data) => {
              validateInput(data.options);
              if (!error) {
                makeDecision(data);
              }
            })}
          >
            <Textarea
              {...register('options')}
              label="Type the options for your decision, one per line..."
              error={error}
              autosize
              minRows={10}
              maxRows={20}
            />
            <Button type="submit" fullWidth>
              Make a decision
            </Button>
          </form>
          <br></br>
          <Link href="/">
            Back to homepage
          </Link>
        </div>
      </Grid.Col>

      <Grid.Col span={7}>
        {decidedOption && (
          <div id="decision" style={{ fontSize: "24px", textAlign: "center" }}>
            <p>The decision has been made, and you should choose:</p>
            {decidedOption}
          </div>
        )}
      </Grid.Col>
    </Grid>
  );
};

export default DecisionMaker;

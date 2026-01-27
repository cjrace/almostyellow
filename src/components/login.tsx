"use client";

import { startTransition, useState } from "react";
import { authenticate } from "@/services/authenticate";
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
} from "@mantine/core";
import { useForm } from "@mantine/form";

export default function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
  });

  const handleFormSubmit = () => {
    const { email, password } = form.values;
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    startTransition(() => {
      authenticate(undefined, formData)
        .then((result) => {
          if (result) {
            setErrorMessage(result);
          }
        })
        .catch(() => {
          setErrorMessage("Something went wrong.");
        });
    });
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Want to access the good stuff?</Title>

      <Paper>
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <TextInput
            required
            label="Email"
            placeholder="e.g. simply@thebest.co.uk"
            value={form.values.email}
            onChange={(event) => {
              form.setFieldValue("email", event.currentTarget.value);
            }}
            error={form.errors.email && "Invalid email"}
            radius="md"
          />
          <PasswordInput
            required
            label="Password"
            placeholder="Enter password"
            value={form.values.password}
            onChange={(event) => {
              form.setFieldValue("password", event.currentTarget.value);
            }}
            radius="md"
          />
          <Button type="submit" fullWidth mt="lg">
            Log in
          </Button>
          {errorMessage && <p>{errorMessage}</p>}
        </form>
      </Paper>
    </Container>
  );
}

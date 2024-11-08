"use client";

import { useActionState } from "react";
import { authenticate } from "@/services/authenticate";
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
} from "@mantine/core";

export default function LoginForm() {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);

  return (
    <Container size={420} my={40}>
      <Title ta="center">Want to access the good stuff?</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form action={formAction}>
          <TextInput
            id="email"
            label="Email"
            placeholder="e.g. simply@thebest.co.uk"
            required
            type="email"
          />
          <PasswordInput
            id="password"
            label="Password"
            placeholder=""
            required
            mt="md"
            visibilityToggleButtonProps={{
              "aria-label": "Toggle password visibility",
            }}
          />

          <Button type="submit" fullWidth mt="lg">
            Sign in
          </Button>

          {errorMessage && <p>{errorMessage}</p>}
        </form>
      </Paper>
    </Container>
  );
}

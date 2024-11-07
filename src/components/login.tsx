"use client";

import { useActionState } from "react";
import { authenticate } from "@/services/authentication";
import { IconExclamationCircle } from "@tabler/icons-react";
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
            label="Email"
            placeholder="e.g. simply@thebest.co.uk"
            required
            type="email"
          />
          <PasswordInput label="Password" placeholder="" required mt="md" />

          <Button fullWidth mt="xl">
            Sign in
          </Button>

          {errorMessage && (
            <>
              <IconExclamationCircle stroke={2} />
              <p color="red">{errorMessage}</p>
            </>
          )}
        </form>
      </Paper>
    </Container>
  );
}

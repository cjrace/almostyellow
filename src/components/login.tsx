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
    <form action={formAction}>
      <Container size={420} my={40}>
        <Title ta="center">Want to access the good stuff?</Title>

        <Paper>
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
              />
            </div>
          </div>
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
                minLength={6}
              />
            </div>
          </div>
          <Button type="submit" fullWidth mt="lg">
            Log in
          </Button>
          {errorMessage && <p>{errorMessage}</p>}
        </Paper>
      </Container>
    </form>
  );
}

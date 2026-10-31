"use client";

import { startTransition, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { signInAction } from "@/actions/signInAction";
import { clientAuth, type FirebaseClientConfig } from "@/firebase/client";
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
} from "@mantine/core";
import { useForm } from "@mantine/form";

// Firebase sign-in failures that mean the email or password is wrong. They
// all get the same message so it does not reveal which accounts exist.
const CREDENTIAL_ERRORS = [
  "auth/invalid-credential",
  "auth/invalid-email",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/wrong-password",
];

function errorMessageFor(error: unknown) {
  if (error instanceof FirebaseError) {
    if (CREDENTIAL_ERRORS.includes(error.code)) return "Invalid credentials.";
    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Try again later.";
    }
  }
  return "Something went wrong.";
}

// Signs in with Firebase in the browser, then swaps the ID token for a server
// session cookie. The browser's own Firebase sign-in is dropped straight
// away, so the cookie is the only session to clear on sign-out.
async function signIn(
  firebaseConfig: FirebaseClientConfig,
  email: string,
  password: string,
  callbackUrl: string | undefined,
) {
  const auth = clientAuth(firebaseConfig);
  let idToken: string;
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    idToken = await user.getIdToken();
  } finally {
    await signOut(auth);
  }
  return signInAction(idToken, callbackUrl);
}

export default function LoginForm({
  callbackUrl,
  firebaseConfig,
}: {
  callbackUrl?: string;
  firebaseConfig: FirebaseClientConfig;
}) {
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
    startTransition(() => {
      signIn(firebaseConfig, email, password, callbackUrl)
        .then((result) => {
          if (result) {
            setErrorMessage(result);
          }
        })
        .catch((error: unknown) => {
          setErrorMessage(errorMessageFor(error));
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
            // Lets browsers and password managers fill in the sign-in
            autoComplete="username"
            value={form.values.email}
            onChange={(event) => {
              form.setFieldValue("email", event.currentTarget.value);
            }}
            error={form.errors.email ? "Invalid email" : undefined}
            radius="md"
          />
          <PasswordInput
            required
            label="Password"
            placeholder="Enter password"
            autoComplete="current-password"
            value={form.values.password}
            onChange={(event) => {
              form.setFieldValue("password", event.currentTarget.value);
            }}
            radius="md"
          />
          <Button type="submit" fullWidth mt="lg">
            Log in
          </Button>
          {/* Always rendered, so screen readers announce a failed sign-in */}
          <div role="alert">{errorMessage && <p>{errorMessage}</p>}</div>
        </form>
      </Paper>
    </Container>
  );
}

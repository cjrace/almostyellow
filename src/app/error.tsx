"use client";

import { useEffect } from "react";
import { Container, Title, Button, Stack } from "@mantine/core";
import Header from "@/components/header";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Header noCrumbs={true} />

      <main>
        <Container size="xs">
          <Stack gap="xl">
            <Title ta="center">Something went very wrong!</Title>
            <Button
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
              }
            >
              Reset the page
            </Button>
            <Button component="a" href="/" variant="default">
              Return home
            </Button>
          </Stack>
        </Container>
      </main>
    </>
  );
}

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
      {/* An error page is a client component, so it cannot export metadata */}
      <title>Something went wrong | Almost Yellow</title>
      <meta name="robots" content="noindex" />
      <Header noCrumbs={true} />

      <main id="main-content">
        <Container size="xs">
          <Stack gap="xl">
            <Title ta="center">Something went very wrong!</Title>
            <Button
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => {
                  reset();
                }
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

"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Container, Anchor } from "@mantine/core";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <Container size="sm">
      <h2>Something went very wrong!</h2>
      <p>
        We suggest you try to{" "}
        <Anchor
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
        >
          reset the page
        </Anchor>
        .
      </p>
      <p>
        If this keeps persisting{" "}
        <Anchor href="/" component="a">
          return home
        </Anchor>
        .
      </p>
    </Container>
  );
}

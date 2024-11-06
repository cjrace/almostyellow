import { Button, Container } from "@mantine/core";

export default function NotFound() {
  return (
    <Container size="xs">
      <h2>Page not found (404)</h2>
      <p>We couldn&apos;t find the page you were looking for.</p>
      <Button href="/" component="a">
        Return home
      </Button>
    </Container>
  );
}

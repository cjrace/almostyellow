import { Button, Container, Title, Text, Stack } from "@mantine/core";

export default function NotFound() {
  return (
    <Container size="xs">
      <Stack gap="xl">
        <Title ta="center">Page not found (404)</Title>
        <Text ta="center">
          We couldn&apos;t find the page you were looking for.
        </Text>
        <Button href="/" component="a">
          Return home
        </Button>
      </Stack>
    </Container>
  );
}

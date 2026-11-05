import Header from "@/components/header";
import ButtonLink from "@/components/buttonlink";
import { Container, Title, Text, Stack } from "@mantine/core";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Header noCrumbs={true} />

      <main id="main-content">
        <Container size="xs">
          <Stack gap="xl">
            <Title ta="center">Page not found (404)</Title>
            <Text ta="center">
              We couldn&apos;t find the page you were looking for.
            </Text>
            <ButtonLink href="/">Return home</ButtonLink>
          </Stack>
        </Container>
      </main>
    </>
  );
}

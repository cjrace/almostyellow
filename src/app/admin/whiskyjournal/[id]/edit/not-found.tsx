import Header from "@/components/header";
import ButtonLink from "@/components/buttonlink";
import { Container, Title, Text, Stack } from "@mantine/core";

export default function WhiskyNotFound() {
  return (
    <>
      <Header noCrumbs={true} />

      <main id="main-content">
        <Container size="xs">
          <Stack gap="xl">
            <Title ta="center">Whisky not found (404)</Title>
            <Text ta="center">
              We couldn&apos;t find the whisky you were looking for.
            </Text>
            <ButtonLink href="/whiskyjournal">
              Return to whisky journal
            </ButtonLink>
          </Stack>
        </Container>
      </main>
    </>
  );
}

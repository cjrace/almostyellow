import Header from "@/components/header";
import { Button, Container, Title, Text, Stack } from "@mantine/core";

export default function FilmNotFound() {
  return (
    <>
      <Header noCrumbs={true} />

      <main id="main-content">
        <Container size="xs">
          <Stack gap="xl">
            <Title ta="center">Film not found (404)</Title>
            <Text ta="center">
              We couldn&apos;t find the film you were looking for.
            </Text>
            <Button href="/film" component="a">
              Return to films list
            </Button>
          </Stack>
        </Container>
      </main>
    </>
  );
}

import Header from "@/components/header";
import { Button, Container, Title, Text, Stack } from "@mantine/core";

export default function RecipeNotFound() {
  return (
    <>
      <Header noCrumbs={true} />

      <main id="main-content">
        <Container size="xs">
          <Stack gap="xl">
            <Title ta="center">Recipe not found (404)</Title>
            <Text ta="center">
              We couldn&apos;t find the recipe you were looking for.
            </Text>
            <Button href="/recipes" component="a">
              Return to recipes
            </Button>
          </Stack>
        </Container>
      </main>
    </>
  );
}

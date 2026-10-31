import { pageMetadata } from "@/metadata";
import { Title, Text } from "@mantine/core";
import Header from "@/components/header";

export const metadata = pageMetadata(
  "Uno",
  "Our Uno game is still under construction, so check back soon.",
);

export default function UnoPage() {
  return (
    <>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <Title>Uno</Title>
        <Text>Under construction...</Text>
      </main>
    </>
  );
}

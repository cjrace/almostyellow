import { Metadata } from "next";
import { Title, Text } from "@mantine/core";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Uno",
};

export default async function UnoPage() {
  return (
    <>
      <Header noCrumbs={true} game={true} />

      <main>
        <Title>Uno</Title>
        <Text>Under construction...</Text>
      </main>
    </>
  );
}

import { Metadata } from "next";
import { Title, Text } from "@mantine/core";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Uno",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Uno", href: "/games/uno" },
];

export default async function UnoPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main>
        <Title>Uno</Title>
        <Text>Under construction...</Text>
      </main>
    </>
  );
}

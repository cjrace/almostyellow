import { Space, Title } from "@mantine/core";
import BoomBoomPirate from "@/components/boomboompirate";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Boom Boom Pirate",
  description: "Pull the right ropes or things will go boom!",
  openGraph: {
    title: "Boom Boom Pirate | Almost Yellow",
    description: "Pull the right ropes or things will go boom!",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Boom Boom Pirate", href: "" },
];

export default function BoomBoomPiratePage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main>
        <Title>Boom Boom Pirate</Title>
        <Space h="xl" />
        <BoomBoomPirate />
      </main>
    </>
  );
}

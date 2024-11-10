import { Space, Title } from "@mantine/core";
import PopUpPirate from "@/components/popuppirate";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Pop up pirate",
  description: "The most fun you can have with a pack of cards.",
  openGraph: {
    title: "Pop up pirate | Almost Yellow",
    description: "The most fun you can have with a pack of cards.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Pop up pirate", href: "" },
];

export default function PopUpPiratePage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main>
        <Title>Pop up pirate</Title>
        <Space h="xl" />
        <PopUpPirate />
      </main>
    </>
  );
}

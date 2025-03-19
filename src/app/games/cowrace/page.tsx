import { Space, Title } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";
import CowRace from "@/components/cowrace";

export const metadata: Metadata = {
  title: "Cow racing",
  description: "Zoom zoom cow!",
  openGraph: {
    title: "Cow Racing | Almost Yellow",
    description: "Zoom zoom cow!",
  },
};

export default function CowRacePage() {
  return (
    <>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <Title>Cow racing</Title>
        <Space h="xl" />
        <CowRace />
      </main>
    </>
  );
}

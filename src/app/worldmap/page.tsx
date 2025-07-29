import WorldMap from "@/components/worldmap2";
import BackToTop from "@/components/backtotop";
import { Metadata } from "next";
import Header from "@/components/header";
import { Container, Title } from "@mantine/core";

export const metadata: Metadata = {
  title: "World Map",
  description: "All the places we've been to.",
  openGraph: {
    title: "World Map | Almost Yellow",
    description: "All the places we've been to.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "World Map", href: "" },
];

export default function WorldMapPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Title>World Map</Title>
        <WorldMap />
        <BackToTop />
      </main>
    </>
  );
}

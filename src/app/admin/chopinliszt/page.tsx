import Checklist from "@/components/chopinliszt";
import { Metadata } from "next";
import Header from "@/components/header";
import { Title, Container } from "@mantine/core";

export const metadata: Metadata = {
  title: "Chopin Liszt",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Chopin Liszt", href: "" },
];

export default function ChopinLiszt() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <Title mb="xl">Our Chopin Liszt</Title>
          <Checklist />
        </Container>
      </main>
    </>
  );
}

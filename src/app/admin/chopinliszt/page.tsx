import Checklist from "@/components/chopinliszt";
import { Metadata } from "next";
import { connection } from "next/server";
import Header from "@/components/header";
import { Title, Container } from "@mantine/core";
import { firebaseClientConfig } from "@/auth";

export const metadata: Metadata = {
  title: "Chopin Liszt",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Chopin Liszt", href: "" },
];

export default async function ChopinLiszt() {
  // Render on each request, so the Firebase settings come from the server's
  // environment rather than being fixed at build time
  await connection();

  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <Title mb="xl">Our Chopin Liszt</Title>
          <Checklist firebaseConfig={firebaseClientConfig()} />
        </Container>
      </main>
    </>
  );
}

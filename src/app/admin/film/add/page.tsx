import { Metadata } from "next";
import Header from "@/components/header";
import { Container } from "@mantine/core";
import { FilmAdd } from "@/components/filmadd";

export const metadata: Metadata = {
  title: "Add film",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Add film", href: "" },
];

export default async function AddFilm() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <FilmAdd />
        </Container>
      </main>
    </>
  );
}

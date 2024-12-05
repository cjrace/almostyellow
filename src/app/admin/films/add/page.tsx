import { Metadata } from "next";
import Header from "@/components/header";
import { Container } from "@mantine/core";
import { FilmAdd } from "@/components/filmadd";

export const metadata: Metadata = {
  title: "Add film",
};

export default async function AddFilm() {
  return (
    <>
      <Header noCrumbs={true} filmList={true} />

      <main id="main-content">
        <Container size="lg">
          <FilmAdd />
        </Container>
      </main>
    </>
  );
}

import { Metadata } from "next";
import Header from "@/components/header";
import { Container } from "@mantine/core";

export const metadata: Metadata = {
  title: "Edit film",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Edit film", href: "" },
];

export default async function EditFilm() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <p>Edit film form here</p>
        </Container>
      </main>
    </>
  );
}

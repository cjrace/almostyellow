import Cocktails from "@/components/cocktails";
import BackToTop from "@/components/backtotop";
import { Metadata } from "next";
import { connection } from "next/server";
import { readCocktails } from "@/services/cocktails";
import Header from "@/components/header";
import { Container, Title } from "@mantine/core";

export const metadata: Metadata = {
  title: "Cocktails",
  description: "Our selection of cocktail recipes.",
  openGraph: {
    title: "Cocktails | Almost Yellow",
    description: "Our selection of top cocktail recipes.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Cocktails", href: "" },
];

export default async function CocktailsPage() {
  // Read the recipes on each request, so changes show without a rebuild
  await connection();
  const cocktails = await readCocktails();

  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <Title>Cocktails</Title>
          <Cocktails cocktails={cocktails} />
          <BackToTop />
        </Container>
      </main>
    </>
  );
}

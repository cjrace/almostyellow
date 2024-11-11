import Cocktails from "@/components/cocktails";
import BackToTop from "@/components/backtotop";
import { Metadata } from "next";
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

export default function CocktailsPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main>
        <Container size="lg">
          <Title>Cocktails</Title>
          <Cocktails />
          <BackToTop />
        </Container>
      </main>
    </>
  );
}

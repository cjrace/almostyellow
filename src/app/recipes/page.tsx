import Recipes from "@/components/recipes";
import BackToTop from "@/components/backtotop";
import { Metadata } from "next";
import Header from "@/components/header";
import { Container, Title } from "@mantine/core";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Our selection of recipes.",
  openGraph: {
    title: "Recipes | Almost Yellow",
    description: "Our selection of top recipes.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Recipes", href: "" },
];

export default function RecipesPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <Title>Recipes</Title>
          <Recipes />
          <BackToTop />
        </Container>
      </main>
    </>
  );
}

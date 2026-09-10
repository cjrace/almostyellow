import { Metadata } from "next";
import Header from "@/components/header";
import { Container } from "@mantine/core";
import { RecipeAdd } from "@/components/recipeadd";

export const metadata: Metadata = {
  title: "Add recipe",
};

export default function AddRecipe() {
  return (
    <>
      <Header noCrumbs={true} recipeList={true} />

      <main id="main-content">
        <Container size="lg">
          <RecipeAdd />
        </Container>
      </main>
    </>
  );
}

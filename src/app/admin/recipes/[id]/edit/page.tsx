import RecipeEditServer from "@/components/recipeedit_server";
import Header from "@/components/header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit recipe",
};

export default async function RecipeEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  // Ensure the component only renders when the id is available and is a string
  if (!id || Array.isArray(id)) {
    return null;
  }

  return (
    <>
      <Header noCrumbs={true} recipeList={true} />
      <RecipeEditServer params={{ id }} />
    </>
  );
}

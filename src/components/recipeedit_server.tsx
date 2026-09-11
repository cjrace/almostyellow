import { readRecipe } from "@/services/recipelist";
import { RecipeEdit } from "@/components/recipeedit";

interface Params {
  id: string;
}

export default async function RecipeEditServer({ params }: { params: Params }) {
  const { id } = params;
  const data = await readRecipe(id);

  return <RecipeEdit recipeData={data[0]} />;
}

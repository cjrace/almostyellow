import "server-only";
import { adminDb } from "@/firebase/admin";
import type { Cocktail } from "@/components/cocktails";

// The cocktails are public, so they are read on the server and need no
// sign-in. There is no page for changing them yet.

interface StoredCocktail {
  name: string;
  spirits: string[];
  rating: number;
  photoUrl: string;
  ingredients: string[];
  instructions: string[];
}

export async function readCocktails(): Promise<Cocktail[]> {
  try {
    const snapshot = await adminDb().collection("cocktails").get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as StoredCocktail;
      return {
        name: data.name,
        spirits: data.spirits,
        rating: data.rating,
        photoUrl: data.photoUrl,
        recipe: {
          ingredients: data.ingredients,
          instructions: data.instructions,
        },
      };
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the cocktails.", { cause: error });
  }
}

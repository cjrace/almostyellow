"use server";

import { type DocumentSnapshot } from "firebase-admin/firestore";
import { requireAuth } from "@/auth";
import { adminDb } from "@/firebase/admin";
import { DocumentId } from "@/firebase/ids";
import { FilmFields } from "@/firebase/records";
import { Film } from "@/components/filmcard";

// The film list is public, so it is read on the server and needs no sign-in.
// Changes go through the Admin SDK too, which bypasses the Security Rules, so
// they are checked here against the same limits as firestore.rules.

const COLLECTION = "films";

interface StoredFilm {
  name: string;
  releaseYear: number;
  top30: boolean;
  watched: boolean;
  notInJar: boolean;
}

function toFilm(snapshot: DocumentSnapshot): Film {
  const data = snapshot.data() as StoredFilm;
  return {
    id: snapshot.id,
    name: data.name,
    release_year: data.releaseYear,
    top_30: data.top30,
    watched: data.watched,
    not_in_jar: data.notInJar,
  };
}

// Throws if the film breaks any of the limits, before anything is written
function toStored(film: Film): StoredFilm {
  const fields = FilmFields.parse(film);
  return {
    name: fields.name,
    releaseYear: fields.release_year,
    top30: fields.top_30,
    watched: fields.watched,
    notInJar: fields.not_in_jar,
  };
}

export async function createFilm(film: Film): Promise<void> {
  await requireAuth();

  const fields = toStored(film);
  try {
    await adminDb().collection(COLLECTION).doc().create(fields);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create a new film entry.", { cause: error });
  }
}

export async function readFilmList(): Promise<Film[]> {
  try {
    const snapshot = await adminDb().collection(COLLECTION).get();
    return snapshot.docs.map(toFilm);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the film list.", { cause: error });
  }
}

// The film with this id, or null if there is no such film
export async function readFilm(film_id: string): Promise<Film | null> {
  if (!DocumentId.safeParse(film_id).success) return null;

  try {
    const snapshot = await adminDb().collection(COLLECTION).doc(film_id).get();
    return snapshot.exists ? toFilm(snapshot) : null;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the film.", { cause: error });
  }
}

// Fails if the film has been deleted, rather than bringing it back
export async function updateFilm(film: Film): Promise<void> {
  await requireAuth();

  const film_id = DocumentId.parse(film.id);
  const fields = toStored(film);
  try {
    await adminDb()
      .collection(COLLECTION)
      .doc(film_id)
      .update({ ...fields });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update film entry.", { cause: error });
  }
}

export async function deleteFilm(film_id: string) {
  await requireAuth();

  const parsed = DocumentId.safeParse(film_id);
  if (!parsed.success) {
    return { message: "No film found with the given ID." };
  }

  try {
    await adminDb().collection(COLLECTION).doc(parsed.data).delete();
  } catch {
    return {
      message: "Database Error: Failed to delete item from film list.",
    };
  }
}

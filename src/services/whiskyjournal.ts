"use server";

import {
  FieldValue,
  type DocumentSnapshot,
  type Timestamp,
} from "firebase-admin/firestore";
import { v4 as generate_uuid } from "uuid";
import { z } from "zod";
import { requireAuth } from "@/auth";
import { adminDb } from "@/firebase/admin";
import { DocumentId } from "@/firebase/ids";
import { Whisky } from "@/components/whiskyjournal";

// The whisky journal is public, so it is read on the server and needs no
// sign-in. Changes go through the Admin SDK too, which bypasses the Security
// Rules, so they are checked here against the same limits as firestore.rules.

const COLLECTION = "whiskies";

const text = z.string().trim().min(1).max(255);

const WhiskyFields = z.object({
  name: text,
  distillery: text,
  country_region: text,
  age: z.number().int().min(0).max(100),
  grain: text,
  abv: z.number().gt(0).max(100),
  rating: z.number().int().min(1).max(5),
  price: z.number().int().min(1).max(3),
  notes: z.string().max(5000),
});

interface StoredWhisky {
  name: string;
  distillery: string;
  countryRegion: string;
  age: number;
  grain: string;
  abv: number;
  rating: number;
  price: number;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toWhisky(snapshot: DocumentSnapshot): Whisky {
  const data = snapshot.data() as StoredWhisky;
  return {
    last_edited: data.updatedAt.toDate(),
    whisky_id: snapshot.id,
    name: data.name,
    distillery: data.distillery,
    country_region: data.countryRegion,
    age: data.age,
    grain: data.grain,
    abv: data.abv,
    rating: data.rating,
    price: data.price,
    notes: data.notes,
  };
}

// Throws if the whisky breaks any of the limits, before anything is written
function toStored(whisky: Whisky) {
  const fields = WhiskyFields.parse(whisky);
  return {
    name: fields.name,
    distillery: fields.distillery,
    countryRegion: fields.country_region,
    age: fields.age,
    grain: fields.grain,
    abv: fields.abv,
    rating: fields.rating,
    price: fields.price,
    notes: fields.notes,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

// Create new whisky
export async function createWhisky(whisky: Whisky): Promise<void> {
  await requireAuth();

  const fields = toStored(whisky);
  try {
    await adminDb()
      .collection(COLLECTION)
      .doc(generate_uuid())
      .create({ ...fields, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create a new whisky entry.", { cause: error });
  }
}

// Read all whiskies
export async function readWhiskyJournal(): Promise<Whisky[]> {
  try {
    const snapshot = await adminDb().collection(COLLECTION).get();
    return snapshot.docs.map(toWhisky);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the whisky journal.", { cause: error });
  }
}

// Read single whisky by id, or null if there is no such whisky
export async function readWhisky(whisky_id: string): Promise<Whisky | null> {
  if (!DocumentId.safeParse(whisky_id).success) return null;

  try {
    const snapshot = await adminDb()
      .collection(COLLECTION)
      .doc(whisky_id)
      .get();
    return snapshot.exists ? toWhisky(snapshot) : null;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the whisky journal.", { cause: error });
  }
}

// Update whisky entry. Fails if the whisky has been deleted, rather than
// bringing it back.
export async function updateWhisky(whisky: Whisky): Promise<void> {
  await requireAuth();

  const whisky_id = DocumentId.parse(whisky.whisky_id);
  const fields = toStored(whisky);
  try {
    await adminDb().collection(COLLECTION).doc(whisky_id).update(fields);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update whisky entry.", { cause: error });
  }
}

// Delete whisky entry
export async function deleteWhisky(whisky_id: string) {
  await requireAuth();

  const parsed = DocumentId.safeParse(whisky_id);
  if (!parsed.success) {
    return { message: "No whisky found with the given ID." };
  }

  try {
    await adminDb().collection(COLLECTION).doc(parsed.data).delete();
  } catch {
    return {
      message: "Database Error: Failed to delete item from whisky journal.",
    };
  }
}

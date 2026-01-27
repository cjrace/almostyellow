"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { Item } from "@/components/chopinliszt";
import { v4 as generate_uuid } from "uuid";

const FormSchema = z.object({
  chopin_text: z.string(),
});

const CreateChopin = FormSchema;

export interface State {
  errors?: {
    chopin_id?: string[];
    chopin_text?: string[];
    checked?: boolean[];
  };
  message?: string | null;
}

export async function createChopin(formData: FormData) {
  const validatedFields = CreateChopin.safeParse({
    chopin_text: formData.get("chopin_text"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to parse chopin_text.",
    };
  }

  const chopin_id = generate_uuid();
  const chopin_text = validatedFields.data.chopin_text;
  const checked = false;

  try {
    await sql`
          INSERT INTO chopin_liszt (chopin_id, chopin_text, checked)
          VALUES (${chopin_id}, ${chopin_text}, ${checked})
        `;
  } catch {
    return {
      message: "Database Error: Failed to add item to Chopin Liszt.",
    };
  }

  revalidatePath("/admin/chopinliszt");
}

export async function readChopin(): Promise<Item[]> {
  try {
    const data = await sql`
        SELECT chopin_id, chopin_text, checked
        FROM chopin_liszt;
      `;

    const latestChopin = data.rows.map((chopin) => ({
      id: chopin.chopin_id,
      text: chopin.chopin_text,
      checked: chopin.checked,
    }));

    return latestChopin;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the Chopin Liszt.");
  }
}

export async function updateChopinChecked(chopinId: string, checked: boolean) {
  try {
    await sql`
        UPDATE chopin_liszt
        SET checked = ${checked}
        WHERE chopin_id = ${chopinId}
      `;
    revalidatePath("/admin/chopinliszt");
  } catch {
    return {
      message:
        "Database Error: Failed to update checked status of item on Chopin Liszt.",
    };
  }
}

export async function deleteChopin(chopin_id: string) {
  try {
    await sql`DELETE FROM chopin_liszt WHERE chopin_id = ${chopin_id}`;
    revalidatePath("/admin/chopinliszt");
  } catch {
    return {
      message: "Database Error: Failed to delete item from Chopin Liszt.",
    };
  }
}

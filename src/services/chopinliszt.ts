"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { Item } from "@/components/chopinliszt";

const FormSchema = z.object({
  chopin_id: z.string(),
  chopin_text: z.string(),
  checked: z.boolean(),
});

const CreateChopin = FormSchema;

export type State = {
  errors?: {
    chopin_id?: string[];
    chopin_text?: string[];
    checked?: boolean[];
  };
  message?: string | null;
};

export async function createChopin(prevState: State, formData: FormData) {
  const validatedFields = CreateChopin.safeParse({
    chopin_id: formData.get("chopin_id"),
    chopin_text: formData.get("chopin_text"),
    checked: formData.get("checked"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to add item to Chopin Liszt.",
    };
  }

  const { chopin_id, chopin_text, checked } = validatedFields.data;

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

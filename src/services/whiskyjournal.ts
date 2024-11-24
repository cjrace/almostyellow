"use server";

import { sql } from "@vercel/postgres";
import { Whisky } from "@/components/whiskyjournal";

// TODO: Think about backup plans?

// Create new whisky

// Read all whiskies
export async function readWhiskyJournal(): Promise<Whisky[]> {
  try {
    const data = await sql`
                SELECT *
                FROM whisky_journal;
            `;

    const whiskies = data.rows.map((whisky) => ({
      last_edited: whisky.last_edited,
      whisky_id: whisky.whisky_id,
      name: whisky.name,
      distillery: whisky.distillery,
      country_region: whisky.country_region,
      age: whisky.age,
      grain: whisky.grain,
      abv: whisky.abv,
      rating: whisky.rating,
      price: whisky.price,
      notes: whisky.notes,
    }));

    return whiskies;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the whisky journal.");
  }
}

// Read single whisky by id

// Update whisky entry

// Delete whisky entry (should only be after confirmation modal!)

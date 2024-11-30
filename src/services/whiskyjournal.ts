"use server";

import { sql } from "@vercel/postgres";
import { Whisky } from "@/components/whiskyjournal";
import { v4 as generate_uuid } from "uuid";

// TODO: Think about backup plans?

// Create new whisky
export async function createWhisky(whisky: Whisky): Promise<void> {
  const whisky_id = generate_uuid();
  const last_edited = new Date().toISOString();

  try {
    await sql`
                INSERT INTO whisky_journal
                (last_edited, whisky_id, name, distillery, country_region, age, grain, abv, rating, price, notes)
                VALUES
                (${last_edited}, ${whisky_id}, ${whisky.name}, ${whisky.distillery}, ${whisky.country_region}, ${whisky.age}, ${whisky.grain}, ${whisky.abv}, ${whisky.rating}, ${whisky.price}, ${whisky.notes});
            `;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create a new whisky entry.");
  }
}

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

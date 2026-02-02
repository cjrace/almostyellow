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
    const data = await sql<Whisky>`
      SELECT last_edited, whisky_id, name, distillery, country_region, age, grain, abv, rating, price, notes
      FROM whisky_journal;
    `;

    const whiskies: Whisky[] = data.rows.map((whisky) => ({
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
export async function readWhisky(whisky_id: string): Promise<Whisky[]> {
  try {
    const data = await sql<Whisky>`
      SELECT last_edited, whisky_id, name, distillery, country_region, age, grain, abv, rating, price, notes
      FROM whisky_journal
      WHERE whisky_id = ${whisky_id};
    `;

    if (data.rows.length > 1) {
      throw new Error("More than one whisky found with the given ID.");
    }

    if (data.rows.length === 0) {
      throw new Error("No whisky found with the given ID.");
    }

    const whisky: Whisky = {
      last_edited: data.rows[0].last_edited,
      whisky_id: data.rows[0].whisky_id,
      name: data.rows[0].name,
      distillery: data.rows[0].distillery,
      country_region: data.rows[0].country_region,
      age: data.rows[0].age,
      grain: data.rows[0].grain,
      abv: data.rows[0].abv,
      rating: data.rows[0].rating,
      price: data.rows[0].price,
      notes: data.rows[0].notes,
    };

    return [whisky];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the whisky journal.");
  }
}

// Update whisky entry
export async function updateWhisky(whisky: Whisky): Promise<void> {
  const last_edited = new Date().toISOString();

  try {
    await sql`
                UPDATE whisky_journal
                SET last_edited = ${last_edited},
                    name = ${whisky.name},
                    distillery = ${whisky.distillery},
                    country_region = ${whisky.country_region},
                    age = ${whisky.age},
                    grain = ${whisky.grain},
                    abv = ${whisky.abv},
                    rating = ${whisky.rating},
                    price = ${whisky.price},
                    notes = ${whisky.notes}
                WHERE whisky_id = ${whisky.whisky_id};
            `;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update whisky entry.");
  }
}

// Delete whisky entry
export async function deleteWhisky(whisky_id: string) {
  try {
    await sql`DELETE FROM whisky_journal WHERE whisky_id = ${whisky_id}`;
  } catch {
    return {
      message: "Database Error: Failed to delete item from whisky journal.",
    };
  }
}

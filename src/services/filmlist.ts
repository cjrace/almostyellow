"use server";

import { sql } from "@vercel/postgres";
import { Film } from "@/components/filmcard";

// TODO: Think about backup plans?

export async function createFilm(film: Film): Promise<void> {
  try {
    await sql`
                INSERT INTO film_list
                (id, name, release_year, top_30, watched, not_in_jar)
                VALUES
                (uuid_generate_v4(), ${film.name}, ${film.release_year}, ${film.top_30}, ${film.watched}, ${film.not_in_jar});
            `;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create a new film entry.");
  }
}

export async function readFilmList(): Promise<Film[]> {
  try {
    const data = await sql<Film>`
      SELECT id, name, release_year, top_30, watched, not_in_jar
      FROM film_list;
    `;

    const films: Film[] = data.rows.map((film) => ({
      id: film.id,
      name: film.name,
      release_year: film.release_year,
      top_30: film.top_30,
      watched: film.watched,
      not_in_jar: film.not_in_jar,
    }));

    return films;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the film list.");
  }
}

export async function readFilm(film_id: string): Promise<Film[]> {
  try {
    const data = await sql<Film>`
      SELECT id, name, release_year, top_30, watched, not_in_jar
      FROM film_list
      WHERE id = ${film_id};
    `;

    if (data.rows.length > 1) {
      throw new Error("More than one film found with the given name.");
    }

    if (data.rows.length === 0) {
      throw new Error("No film found with the given name.");
    }

    const film: Film = {
      id: data.rows[0].id,
      name: data.rows[0].name,
      release_year: data.rows[0].release_year,
      top_30: data.rows[0].top_30,
      watched: data.rows[0].watched,
      not_in_jar: data.rows[0].not_in_jar,
    };

    return [film];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the film.");
  }
}

export async function updateFilm(film: Film): Promise<void> {
  try {
    await sql`
                UPDATE film_list
                SET name = ${film.name},
                    release_year = ${film.release_year},
                    top_30 = ${film.top_30},
                    watched = ${film.watched},
                    not_in_jar = ${film.not_in_jar}
                WHERE id = ${film.id};
            `;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update film entry.");
  }
}

export async function deleteFilm(film_id: string) {
  try {
    await sql`DELETE FROM film_list WHERE id = ${film_id};`;
  } catch {
    return {
      message: "Database Error: Failed to delete item from film list.",
    };
  }
}

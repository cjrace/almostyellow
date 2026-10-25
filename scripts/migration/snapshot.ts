// The intermediate format between Postgres and Firestore: everything the
// importer needs, read from Postgres once and kept as plain JSON. An export
// can be checked, kept as a backup and imported again without Postgres.
//
// The users table is never exported. Its password hashes have no place in
// Firestore, and the two accounts are created in Firebase Authentication.

export interface Snapshot {
  version: 1;
  exportedAt: string;
  tables: {
    whisky_journal: Record<string, unknown>[];
    film_list: Record<string, unknown>[];
    chopin_liszt: Record<string, unknown>[];
  };
}

// Runs one query and returns its rows, so the export can use any Postgres
// client, and a fake in tests
export type Query = (text: string) => Promise<Record<string, unknown>[]>;

// Ordered by ID, so the same data always gives the same export
const QUERIES: Record<keyof Snapshot["tables"], string> = {
  whisky_journal: `SELECT last_edited, whisky_id, name, distillery, country_region,
      age, grain, abv, rating, price, notes
    FROM whisky_journal ORDER BY whisky_id`,
  film_list: `SELECT id, name, release_year, top_30, watched, not_in_jar
    FROM film_list ORDER BY id`,
  chopin_liszt: `SELECT chopin_id, chopin_text, checked
    FROM chopin_liszt ORDER BY chopin_id`,
};

export async function exportSnapshot(
  query: Query,
  now = new Date(),
): Promise<Snapshot> {
  const tables = {} as Snapshot["tables"];
  for (const [table, text] of Object.entries(QUERIES)) {
    // Through JSON, so dates become ISO strings exactly as they will be
    // stored in the file
    tables[table as keyof Snapshot["tables"]] = JSON.parse(
      JSON.stringify(await query(text)),
    ) as Record<string, unknown>[];
  }
  return { version: 1, exportedAt: now.toISOString(), tables };
}

export function parseSnapshot(json: string): Snapshot {
  const snapshot = JSON.parse(json) as Partial<Snapshot> | null;
  const tables = snapshot?.tables;
  if (
    snapshot?.version !== 1 ||
    typeof snapshot.exportedAt !== "string" ||
    !tables ||
    !Array.isArray(tables.whisky_journal) ||
    !Array.isArray(tables.film_list) ||
    !Array.isArray(tables.chopin_liszt)
  ) {
    throw new Error("This is not an export made by scripts/migrate.mts.");
  }
  return snapshot as Snapshot;
}

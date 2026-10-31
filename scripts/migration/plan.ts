// Turns a Postgres export into the Firestore documents to write. Every row
// is checked against the same limits the app uses, and any that fail are
// listed with the reasons rather than imported. Nothing here touches a
// database, so the result can be reviewed before anything is written.
import { z } from "zod";
import { cocktailDocuments } from "../../data/cocktails.ts";
import { DocumentId } from "../../src/firebase/ids.ts";
import {
  FilmFields,
  ShoppingItemFields,
  WhiskyFields,
} from "../../src/firebase/records.ts";
import type { Snapshot } from "./snapshot.ts";

export const COLLECTIONS = [
  "whiskies",
  "films",
  "shoppingItems",
  "cocktails",
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export interface PlannedDocument {
  id: string;
  data: Record<string, unknown>;
}

// A row that will not be imported
export interface Rejection {
  table: string;
  id: string;
  reasons: string[];
}

// A row that will be imported, but not exactly as it was
export interface Change {
  table: string;
  id: string;
  note: string;
}

export interface ImportPlan {
  exportedAt: string;
  collections: Record<CollectionName, PlannedDocument[]>;
  rejected: Rejection[];
  changes: Change[];
}

// Shopping items had no record of who changed them in Postgres
export const IMPORTED_BY = "postgres-import";

// Postgres returns DECIMAL columns as text
const number = z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)]);

const WhiskyRow = z.object({
  whisky_id: z.string(),
  last_edited: z.iso.datetime({ offset: true }),
  name: z.string(),
  distillery: z.string(),
  country_region: z.string(),
  age: number,
  grain: z.string(),
  abv: number,
  rating: number,
  price: number,
  notes: z.string(),
});

const FilmRow = z.object({
  id: z.string(),
  name: z.string(),
  // Text in Postgres, a number in Firestore
  release_year: z.string().regex(/^\d{4}$/, "must be a four-digit year"),
  top_30: z.boolean(),
  watched: z.boolean(),
  not_in_jar: z.boolean(),
});

const ShoppingRow = z.object({
  chopin_id: z.string(),
  chopin_text: z.string(),
  checked: z.boolean(),
});

function reasonsFrom(error: z.ZodError) {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "row"}: ${issue.message}`,
  );
}

function rowId(row: Record<string, unknown>, key: string) {
  const id = row[key];
  return typeof id === "string" ? id : JSON.stringify(id ?? null);
}

// Rows whose ID appears more than once are all left out, since there is no
// telling which is right
function duplicateIds(rows: Record<string, unknown>[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = rowId(row, key);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([id]) => id));
}

// Notes any text the checks trimmed, so the change shows in the report
function noteTrimmed(
  changes: Change[],
  table: string,
  id: string,
  raw: Record<string, unknown>,
  parsed: Record<string, unknown>,
) {
  for (const [field, value] of Object.entries(parsed)) {
    if (typeof value === "string" && raw[field] !== value) {
      changes.push({ table, id, note: `${field}: trimmed spaces` });
    }
  }
}

interface TableSpec<Row extends z.ZodType, Fields extends z.ZodType> {
  table: keyof Snapshot["tables"];
  idKey: string;
  row: Row;
  fields: (row: z.infer<Row>) => Record<string, unknown>;
  schema: Fields;
  toData: (
    fields: z.infer<Fields>,
    row: z.infer<Row>,
  ) => Record<string, unknown>;
}

function planTable<Row extends z.ZodType, Fields extends z.ZodType>(
  snapshot: Snapshot,
  spec: TableSpec<Row, Fields>,
  rejected: Rejection[],
  changes: Change[],
): PlannedDocument[] {
  const rows = snapshot.tables[spec.table];
  const duplicates = duplicateIds(rows, spec.idKey);
  const documents: PlannedDocument[] = [];

  for (const raw of rows) {
    const id = rowId(raw, spec.idKey);
    const reject = (reasons: string[]) => {
      rejected.push({ table: spec.table, id, reasons });
    };

    if (duplicates.has(id)) {
      reject(["the ID appears more than once"]);
      continue;
    }
    if (!DocumentId.safeParse(id).success) {
      reject(["the ID cannot be used as a Firestore document ID"]);
      continue;
    }
    const row = spec.row.safeParse(raw);
    if (!row.success) {
      reject(reasonsFrom(row.error));
      continue;
    }
    const input = spec.fields(row.data);
    const fields = spec.schema.safeParse(input);
    if (!fields.success) {
      reject(reasonsFrom(fields.error));
      continue;
    }
    noteTrimmed(
      changes,
      spec.table,
      id,
      input,
      fields.data as Record<string, unknown>,
    );
    documents.push({ id, data: spec.toData(fields.data, row.data) });
  }
  return documents;
}

export function planImport(snapshot: Snapshot): ImportPlan {
  const rejected: Rejection[] = [];
  const changes: Change[] = [];
  const exportedAt = new Date(snapshot.exportedAt);

  const whiskies = planTable(
    snapshot,
    {
      table: "whisky_journal",
      idKey: "whisky_id",
      row: WhiskyRow,
      fields: (row) => ({
        ...row,
        age: Number(row.age),
        abv: Number(row.abv),
        rating: Number(row.rating),
        price: Number(row.price),
      }),
      schema: WhiskyFields,
      // Postgres only kept the last edit, so that stands for both
      toData: (fields, row) => ({
        name: fields.name,
        distillery: fields.distillery,
        countryRegion: fields.country_region,
        age: fields.age,
        grain: fields.grain,
        abv: fields.abv,
        rating: fields.rating,
        price: fields.price,
        notes: fields.notes,
        createdAt: new Date(row.last_edited),
        updatedAt: new Date(row.last_edited),
      }),
    },
    rejected,
    changes,
  );

  const films = planTable(
    snapshot,
    {
      table: "film_list",
      idKey: "id",
      row: FilmRow,
      fields: (row) => ({ ...row, release_year: Number(row.release_year) }),
      schema: FilmFields,
      toData: (fields) => ({
        name: fields.name,
        releaseYear: fields.release_year,
        top30: fields.top_30,
        watched: fields.watched,
        notInJar: fields.not_in_jar,
      }),
    },
    rejected,
    changes,
  );

  // Postgres kept no order, so items keep the order of the export
  const shoppingItems = planTable(
    snapshot,
    {
      table: "chopin_liszt",
      idKey: "chopin_id",
      row: ShoppingRow,
      fields: (row) => ({ text: row.chopin_text, checked: row.checked }),
      schema: ShoppingItemFields,
      toData: (fields) => ({
        text: fields.text,
        checked: fields.checked,
        order: 0,
        createdAt: exportedAt,
        updatedAt: exportedAt,
        updatedBy: IMPORTED_BY,
      }),
    },
    rejected,
    changes,
  ).map((item, index) => ({
    ...item,
    data: { ...item.data, order: index + 1 },
  }));

  // The cocktails were kept in the code rather than Postgres
  const cocktails = cocktailDocuments.map(({ id, ...data }) => ({ id, data }));

  return {
    exportedAt: snapshot.exportedAt,
    collections: { whiskies, films, shoppingItems, cocktails },
    rejected,
    changes,
  };
}

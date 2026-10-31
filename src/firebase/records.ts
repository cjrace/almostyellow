import { z } from "zod";

// Limits for each kind of record, matching firestore.rules. The server
// actions and the Postgres importer write with the Admin SDK, which skips the
// rules, so they check records against these instead. Keep the two in step.

const text = z.string().trim().min(1).max(255);

export const WhiskyFields = z.object({
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

export const FilmFields = z.object({
  name: text,
  release_year: z
    .number()
    .int()
    .min(1800)
    .refine((year) => year <= new Date().getFullYear() + 1, {
      message: "Release year cannot be more than one year into the future",
    }),
  top_30: z.boolean(),
  watched: z.boolean(),
  not_in_jar: z.boolean(),
});

export const ShoppingItemFields = z.object({
  text,
  checked: z.boolean(),
});

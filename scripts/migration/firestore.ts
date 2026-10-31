// Writes an import plan to Firestore and checks what is there afterwards.
// Uses the Admin SDK, which skips the Security Rules, so the plan must
// already have been checked (see plan.ts).
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  type Change,
  type CollectionName,
  type ImportPlan,
  type Rejection,
} from "./plan.ts";

// Firestore allows 500 writes per batch
const BATCH_SIZE = 400;

export interface ImportOptions {
  batchSize?: number;
  // Called after each batch is written. Tests use it to stop part way.
  afterBatch?: (written: number) => void;
}

/**
 * Writes every planned document, replacing any already there with the same
 * ID. Document IDs come from Postgres, so running it again, or after it
 * stopped part way, gives the same result rather than duplicates. Documents
 * that are not in the plan are left alone, and reported by reconcile().
 */
export async function importPlan(
  db: Firestore,
  plan: ImportPlan,
  { batchSize = BATCH_SIZE, afterBatch }: ImportOptions = {},
) {
  const writes = COLLECTIONS.flatMap((name) =>
    plan.collections[name].map((document) => ({ name, ...document })),
  );
  let written = 0;
  for (let start = 0; start < writes.length; start += batchSize) {
    const batch = db.batch();
    for (const { name, id, data } of writes.slice(start, start + batchSize)) {
      batch.set(db.collection(name).doc(id), data);
    }
    await batch.commit();
    written = Math.min(start + batchSize, writes.length);
    afterBatch?.(written);
  }
  return written;
}

export interface CollectionReport {
  expected: number;
  found: number;
  missing: string[];
  extra: string[];
  changed: { id: string; fields: string[] }[];
}

export interface ReconciliationReport {
  ok: boolean;
  exportedAt: string;
  collections: Record<CollectionName, CollectionReport>;
  rejected: Rejection[];
  changes: Change[];
}

// Timestamps and dates compare as ISO strings, and objects with their keys
// sorted, so equal values always look equal
function normalise(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalise(item)]),
    );
  }
  return value;
}

function differentFields(
  expected: Record<string, unknown>,
  found: Record<string, unknown>,
) {
  const fields = new Set([...Object.keys(expected), ...Object.keys(found)]);
  return [...fields]
    .filter(
      (field) =>
        JSON.stringify(normalise(expected[field])) !==
        JSON.stringify(normalise(found[field])),
    )
    .sort();
}

/**
 * Compares every collection in Firestore with the plan: counts, IDs and every
 * field of every document. ok is only true when they match exactly.
 */
export async function reconcile(
  db: Firestore,
  plan: ImportPlan,
): Promise<ReconciliationReport> {
  const collections = {} as Record<CollectionName, CollectionReport>;
  for (const name of COLLECTIONS) {
    const snapshot = await db.collection(name).get();
    const found = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));
    const expected = plan.collections[name];
    const expectedIds = new Set(expected.map((document) => document.id));

    const changed: CollectionReport["changed"] = [];
    const missing: string[] = [];
    for (const { id, data } of expected) {
      const stored = found.get(id);
      if (!stored) {
        missing.push(id);
        continue;
      }
      const fields = differentFields(data, stored);
      if (fields.length > 0) changed.push({ id, fields });
    }

    collections[name] = {
      expected: expected.length,
      found: found.size,
      missing,
      extra: [...found.keys()].filter((id) => !expectedIds.has(id)).sort(),
      changed,
    };
  }

  const ok = Object.values(collections).every(
    (report) =>
      report.missing.length === 0 &&
      report.extra.length === 0 &&
      report.changed.length === 0,
  );
  return {
    ok,
    exportedAt: plan.exportedAt,
    collections,
    rejected: plan.rejected,
    changes: plan.changes,
  };
}

export function summarise(report: ReconciliationReport) {
  const lines = [
    `Export taken ${report.exportedAt}`,
    ...COLLECTIONS.map((name) => {
      const { expected, found, missing, extra, changed } =
        report.collections[name];
      return `  ${name}: ${String(found)} found, ${String(expected)} expected, ${String(missing.length)} missing, ${String(extra.length)} extra, ${String(changed.length)} different`;
    }),
    `  ${String(report.rejected.length)} rows not imported, ${String(report.changes.length)} values changed on the way`,
    report.ok
      ? "Firestore matches the export."
      : "Firestore does NOT match the export. See the report for details.",
  ];
  return lines.join("\n");
}

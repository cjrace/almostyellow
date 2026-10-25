// Moves the data from Postgres to Firestore, see AGENTS.md.
//
//   pnpm migrate export <file>     read Postgres into a JSON file
//   pnpm migrate plan <file>       show what an import would do
//   pnpm migrate import <file>     write it to Firestore, then check
//   pnpm migrate reconcile <file>  check Firestore against the file
//   pnpm migrate rehearse <file>   export, import twice and check, against
//                                  the emulator only (pnpm migrate:rehearse)
//
// Exports hold personal data, so keep them in migration-output/, which git
// ignores. Import refuses an export with rows that fail the checks unless
// --allow-rejected is given, and every import or check writes a report to
// <file>.report.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  importPlan,
  reconcile,
  summarise,
  type ReconciliationReport,
} from "./migration/firestore.ts";
import { planImport, type ImportPlan } from "./migration/plan.ts";
import {
  exportSnapshot,
  parseSnapshot,
  type Snapshot,
} from "./migration/snapshot.ts";
import { firestoreTarget } from "./migration/target.ts";

const [command, file, ...flags] = process.argv.slice(2);
const allowRejected = flags.includes("--allow-rejected");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!command || !file) {
  fail("Usage: pnpm migrate <export|plan|import|reconcile|rehearse> <file>");
}

function firestore() {
  let target;
  try {
    target = firestoreTarget();
  } catch (error) {
    fail((error as Error).message);
  }
  console.log(
    target.kind === "emulator"
      ? `Using the Firestore emulator, project ${target.projectId}`
      : `Using the REAL Firestore of project ${target.projectId}`,
  );
  const app =
    target.kind === "emulator"
      ? initializeApp({ projectId: target.projectId })
      : initializeApp({
          projectId: target.projectId,
          credential: cert(JSON.parse(target.serviceAccount) as object),
        });
  return { target, db: getFirestore(app) };
}

async function exportTo(path: string) {
  if (!process.env.POSTGRES_URL) fail("POSTGRES_URL is not set.");
  // Only loaded when needed, as it connects to Postgres
  const { sql } = await import("../src/db.ts");
  const snapshot = await exportSnapshot(
    async (text) => (await sql.query(text)).rows,
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snapshot, null, 2));
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    console.log(`  ${table}: ${String(rows.length)} rows`);
  }
  console.log(`Exported to ${path}`);
  return snapshot;
}

function readPlan(path: string) {
  return planImport(parseSnapshot(readFileSync(path, "utf8")));
}

function describePlan(plan: ImportPlan) {
  for (const [name, documents] of Object.entries(plan.collections)) {
    console.log(`  ${name}: ${String(documents.length)} to import`);
  }
  for (const { table, id, reasons } of plan.rejected) {
    console.log(`  NOT IMPORTED ${table} ${id}: ${reasons.join("; ")}`);
  }
  for (const { table, id, note } of plan.changes) {
    console.log(`  changed ${table} ${id}: ${note}`);
  }
}

function writeReport(path: string, report: ReconciliationReport) {
  writeFileSync(`${path}.report.json`, JSON.stringify(report, null, 2));
  console.log(summarise(report));
  console.log(`Report written to ${path}.report.json`);
}

function refuseRejected(plan: ImportPlan) {
  if (plan.rejected.length > 0 && !allowRejected) {
    fail(
      `${String(plan.rejected.length)} rows failed the checks, so nothing was imported. Fix them in Postgres and export again, or pass --allow-rejected to import the rest.`,
    );
  }
}

// The export file and Firestore should hold the same rows as Postgres
function checkCounts(snapshot: Snapshot, plan: ImportPlan) {
  const pairs = [
    ["whisky_journal", "whiskies"],
    ["film_list", "films"],
    ["chopin_liszt", "shoppingItems"],
  ] as const;
  for (const [table, collection] of pairs) {
    const rows = snapshot.tables[table].length;
    const documents = plan.collections[collection].length;
    if (rows !== documents) {
      fail(
        `${table} has ${String(rows)} rows but ${String(documents)} documents were planned.`,
      );
    }
  }
}

switch (command) {
  case "export": {
    await exportTo(file);
    break;
  }
  case "plan": {
    describePlan(readPlan(file));
    break;
  }
  case "import": {
    const plan = readPlan(file);
    describePlan(plan);
    refuseRejected(plan);
    const { db } = firestore();
    console.log(`Wrote ${String(await importPlan(db, plan))} documents`);
    const report = await reconcile(db, plan);
    writeReport(file, report);
    if (!report.ok) process.exit(1);
    break;
  }
  case "reconcile": {
    const { db } = firestore();
    const report = await reconcile(db, readPlan(file));
    writeReport(file, report);
    if (!report.ok) process.exit(1);
    break;
  }
  case "rehearse": {
    const { target, db } = firestore();
    if (target.kind !== "emulator")
      fail("Rehearsals only run against the emulator.");
    const snapshot = await exportTo(file);
    const plan = planImport(snapshot);
    describePlan(plan);
    refuseRejected(plan);
    checkCounts(snapshot, plan);
    // Twice, to show a second run changes nothing
    await importPlan(db, plan);
    await importPlan(db, plan);
    const report = await reconcile(db, plan);
    writeReport(file, report);
    if (!report.ok) process.exit(1);
    break;
  }
  default:
    fail(`Unknown command "${command}".`);
}
process.exit(0);

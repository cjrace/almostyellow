import { z } from "zod";

// Firestore document IDs used by the server actions. Existing records keep
// the UUIDs they had in Postgres. Checking an ID before it reaches doc() also
// stops a "/" in it pointing at a different document path.
export const DocumentId = z.string().regex(/^[\w-]{1,128}$/);

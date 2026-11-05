import { getSession } from "@/auth";

export async function GET() {
  const session = await getSession();
  return Response.json(
    { uid: session?.uid ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
